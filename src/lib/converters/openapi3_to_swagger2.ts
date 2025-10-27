import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import * as YAML from 'js-yaml';
import { BaseFormat } from '../../types';

// Simple deep clone function to replace lodash.clonedeep
function deepClone(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }

  if (typeof obj === 'object') {
    const cloned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const SCHEMA_PROPERTIES = [
  'format',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minLength',
  'maxLength',
  'multipleOf',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minProperties',
  'maxProperties',
  'additionalProperties',
  'pattern',
  'enum',
  'default',
];
const ARRAY_PROPERTIES = ['type', 'items'];

// Pre-compile regex with case-insensitive flag for better performance
const APPLICATION_JSON_REGEX = /^(application\/json|[^;/ \t]+\/[^;/ \t]+[+]json)[ \t]*(;.*)?$/i;
const SUPPORTED_MIME_TYPES = {
  APPLICATION_X_WWW_URLENCODED: 'application/x-www-form-urlencoded',
  MULTIPART_FORM_DATA: 'multipart/form-data',
};

export class OpenApi3ToSwagger2Converter {
  private readonly spec: any;
  private readonly directory?: string;

  constructor(data: BaseFormat) {
    this.spec = JSON.parse(JSON.stringify(data.spec));
    if (data.source && !data.source.startsWith('http')) {
      this.directory = path.dirname(data.source);
    }
  }

  public convert(): any {
    this.spec.swagger = '2.0';
    this.convertInfos();
    this.convertOperations();
    if (this.spec.components) {
      this.convertSchemas();
      this.convertSecurityDefinitions();

      this.spec['x-components'] = this.spec.components;
      delete this.spec.components;

      this.fixRefs(this.spec);
    }
    return this.spec;
  }

  public resolveReference(base: any, obj: any, shouldClone: boolean): any {
    if (!obj?.$ref) return obj;
    const ref = obj.$ref;
    if (ref.startsWith('#')) {
      const keys = ref.split('/').map((k: string) => k.replace(/~1/g, '/').replace(/~0/g, '~'));
      keys.shift();
      let cur = base;
      keys.forEach((k: string) => {
        cur = cur[k];
      });
      return shouldClone ? deepClone(cur) : cur;
    } else if (ref.startsWith('http') || !this.directory) {
      throw new Error('Remote $ref URLs are not currently supported for openapi_3');
    } else {
      const res = ref.split('#/', 2);
      const content = fs.readFileSync(path.join(this.directory as string, res[0]), 'utf8');
      let external: any = null;
      try {
        external = JSON.parse(content);
      } catch {
        try {
          external = YAML.load(content);
        } catch {
          throw new Error('Could not parse path of $ref ' + res[0] + ' as JSON or YAML');
        }
      }
      if (res.length > 1) {
        const keys = res[1]
          .split('/')
          .map((k: string) => k.replace(/~1/g, '/').replace(/~0/g, '~'));
        keys.forEach((k: string) => {
          external = external[k];
        });
      }
      return external;
    }
  }

  private fixRef(ref: string): string {
    return ref
      .replace('#/components/schemas/', '#/definitions/')
      .replace('#/components/', '#/x-components/');
  }

  private fixRefs(obj: any): void {
    if (Array.isArray(obj)) {
      obj.forEach((item: any) => this.fixRefs(item));
    } else if (typeof obj === 'object') {
      for (const key in obj) {
        if (key === '$ref') {
          obj.$ref = this.fixRef(obj.$ref);
        } else {
          this.fixRefs(obj[key]);
        }
      }
    }
  }

  private convertInfos(): void {
    const server = this.spec.servers && this.spec.servers[0];
    if (server) {
      let serverUrl = server.url;
      const variables = server['variables'] || {};
      for (const variable in variables) {
        const variableObject = variables[variable] || {};
        if (variableObject['default']) {
          const re = RegExp('{' + variable + '}', 'g');
          serverUrl = serverUrl.replace(re, variableObject['default']);
        }
      }
      const urlObj = url.parse(serverUrl);
      if (urlObj.host == null) {
        delete this.spec.host;
      } else {
        this.spec.host = urlObj.host;
      }
      if (urlObj.protocol == null) {
        delete this.spec.schemes;
      } else {
        this.spec.schemes = [urlObj.protocol?.substring(0, urlObj.protocol.length - 1) as string];
      }
      this.spec.basePath = urlObj.pathname;
    }
    delete this.spec.servers;
    delete this.spec.openapi;
  }

  private convertOperations(): void {
    for (const path in this.spec.paths) {
      const pathObject = (this.spec.paths[path] = this.resolveReference(
        this.spec,
        this.spec.paths[path],
        true
      ));
      this.convertParameters(pathObject);
      for (const method in pathObject) {
        if (HTTP_METHODS.indexOf(method) >= 0) {
          const operation = (pathObject[method] = this.resolveReference(
            this.spec,
            pathObject[method],
            true
          ));
          this.convertOperationParameters(operation);
          this.convertResponses(operation);
        }
      }
    }
  }

  private convertOperationParameters(operation: any): void {
    let content: any, param: any, contentKey: string, mediaRanges: string[], mediaTypes: string[];
    operation.parameters = operation.parameters || [];
    if (operation.requestBody) {
      param = this.resolveReference(this.spec, operation.requestBody, true);

      if (operation.requestBody.content) {
        const type = this.getSupportedMimeTypes(operation.requestBody.content)[0];
        const structuredObj: any = { content: {} };
        const data = operation.requestBody.content[type];

        if (data && data.schema && data.schema.$ref && !data.schema.$ref.startsWith('#')) {
          param = this.resolveReference(this.spec, data.schema, true);
          structuredObj['content'][`${type}`] = { schema: param };
          param = structuredObj;
        }
      }

      param.name = 'body';
      content = param.content;
      if (content && Object.keys(content).length) {
        mediaRanges = Object.keys(content).filter(
          (mediaRange: string) => mediaRange.indexOf('/') > 0
        );
        mediaTypes = mediaRanges.filter((range: string) => range.indexOf('*') < 0);
        contentKey = this.getSupportedMimeTypes(content)[0];
        delete param.content;

        if (
          contentKey === SUPPORTED_MIME_TYPES.APPLICATION_X_WWW_URLENCODED ||
          contentKey === SUPPORTED_MIME_TYPES.MULTIPART_FORM_DATA
        ) {
          operation.consumes = mediaTypes;
          param.in = 'formData';
          param.schema = content[contentKey].schema;
          param.schema = this.resolveReference(this.spec, param.schema, true);
          if (param.schema.type === 'object' && param.schema.properties) {
            const required = param.schema.required || [];
            for (const name in param.schema.properties) {
              const schema = param.schema.properties[name];
              if (!schema.readOnly) {
                const formDataParam: any = {
                  name,
                  in: 'formData',
                  schema,
                };
                if (required.indexOf(name) >= 0) {
                  formDataParam.required = true;
                }
                operation.parameters.push(formDataParam);
              }
            }
          } else {
            operation.parameters.push(param);
          }
        } else if (contentKey) {
          operation.consumes = mediaTypes;
          param.in = 'body';
          param.schema = content[contentKey].schema;
          operation.parameters.push(param);
        } else if (mediaRanges) {
          operation.consumes = mediaTypes || ['application/octet-stream'];
          param.in = 'body';
          param.name = param.name || 'file';
          delete param.type;
          param.schema = content[mediaRanges[0]].schema || {
            type: 'string',
            format: 'binary',
          };
          operation.parameters.push(param);
        }

        if (param.schema) {
          this.convertSchema(param.schema, 'request');
        }
      }
      delete operation.requestBody;
    }
    this.convertParameters(operation);
  }

  private convertParameters(obj: any): void {
    if (obj.parameters === undefined) {
      return;
    }

    obj.parameters = obj.parameters || [];

    (obj.parameters || []).forEach((param: any, i: number) => {
      param = obj.parameters[i] = this.resolveReference(this.spec, param, false);
      if (param.in !== 'body') {
        this.copySchemaProperties(param, SCHEMA_PROPERTIES);
        this.copySchemaProperties(param, ARRAY_PROPERTIES);
        this.copySchemaXProperties(param);
        if (!param.description) {
          const schema = this.resolveReference(this.spec, param.schema, false);
          if (!!schema && schema.description) {
            param.description = schema.description;
          }
        }
        delete param.schema;
        delete param.allowReserved;
        if (param.example !== undefined) {
          param['x-example'] = param.example;
        }
        delete param.example;
      }
      if (param.type === 'array') {
        const style =
          param.style || (param.in === 'query' || param.in === 'cookie' ? 'form' : 'simple');
        if (style === 'matrix') {
          param.collectionFormat = param.explode ? undefined : 'csv';
        } else if (style === 'label') {
          param.collectionFormat = undefined;
        } else if (style === 'simple') {
          param.collectionFormat = 'csv';
        } else if (style === 'spaceDelimited') {
          param.collectionFormat = 'ssv';
        } else if (style === 'pipeDelimited') {
          param.collectionFormat = 'pipes';
        } else if (style === 'deepOpbject') {
          param.collectionFormat = 'multi';
        } else if (style === 'form') {
          param.collectionFormat = param.explode === false ? 'csv' : 'multi';
        }
      }
      delete param.style;
      delete param.explode;
    });
  }

  private copySchemaProperties(obj: any, props: string[]): void {
    const schema = this.resolveReference(this.spec, obj.schema, true);
    if (!schema) return;
    props.forEach((prop: string) => {
      const value = schema[prop];

      switch (prop) {
        case 'additionalProperties':
          if (typeof value === 'boolean') return;
      }

      if (value !== undefined) {
        obj[prop] = value;
      }
    });
  }

  private copySchemaXProperties(obj: any): void {
    const schema = this.resolveReference(this.spec, obj.schema, true);
    if (!schema) return;
    for (const propName in schema) {
      if (
        Object.prototype.hasOwnProperty.call(schema, propName) &&
        !Object.prototype.hasOwnProperty.call(obj, propName) &&
        propName.startsWith('x-')
      ) {
        obj[propName] = schema[propName];
      }
    }
  }

  private convertResponses(operation: any): void {
    for (const code in operation.responses) {
      const response = (operation.responses[code] = this.resolveReference(
        this.spec,
        operation.responses[code],
        true
      ));
      if (response.content) {
        let anySchema: any = null,
          jsonSchema: any = null;
        for (const mediaRange in response.content) {
          const mediaType = mediaRange.indexOf('*') < 0 ? mediaRange : 'application/octet-stream';
          if (!operation.produces) {
            operation.produces = [mediaType];
          } else if (operation.produces.indexOf(mediaType) < 0) {
            operation.produces.push(mediaType);
          }

          const content = response.content[mediaRange];

          anySchema = anySchema || content.schema;
          if (!jsonSchema && this.isJsonMimeType(mediaType)) {
            jsonSchema = content.schema;
          }

          if (content.example) {
            response.examples = response.examples || {};
            response.examples[mediaType] = content.example;
          }
        }

        if (anySchema) {
          response.schema = jsonSchema || anySchema;
          const resolved = this.resolveReference(this.spec, response.schema, true);
          if (resolved && response.schema.$ref && !response.schema.$ref.startsWith('#')) {
            response.schema = resolved;
          }

          this.convertSchema(response.schema, 'response');
        }
      }

      const headers = response.headers;
      if (headers) {
        for (const header in headers) {
          const resolved = this.resolveReference(this.spec, headers[header], true);
          if (resolved.schema) {
            resolved.type = resolved.schema.type;
            resolved.format = resolved.schema.format;
            delete resolved.schema;
          }
          headers[header] = resolved;
        }
      }

      delete response.content;
    }
  }

  private convertSchema(def: any, operationDirection: string): void {
    if (def.oneOf) {
      delete def.oneOf;
      if (def.discriminator) {
        delete def.discriminator;
      }
    }

    if (def.anyOf) {
      delete def.anyOf;
      if (def.discriminator) {
        delete def.discriminator;
      }
    }

    if (def.allOf) {
      for (const i in def.allOf) {
        this.convertSchema(def.allOf[i], operationDirection);
      }
    }

    if (def.discriminator) {
      if (def.discriminator.mapping) {
        this.convertDiscriminatorMapping(def.discriminator.mapping);
      }
      def.discriminator = def.discriminator.propertyName;
    }

    switch (def.type) {
      case 'object':
        if (def.properties) {
          for (const propName in def.properties) {
            if (def.properties[propName].writeOnly === true && operationDirection === 'response') {
              delete def.properties[propName];
            } else {
              this.convertSchema(def.properties[propName], operationDirection);
              delete def.properties[propName].writeOnly;
            }
          }
        }
        break;
      case 'array':
        if (def.items) {
          this.convertSchema(def.items, operationDirection);
        }
    }

    if (def.nullable) {
      def['x-nullable'] = true;
      delete def.nullable;
    }

    if (def['deprecated'] !== undefined) {
      if (def['x-deprecated'] === undefined) {
        def['x-deprecated'] = def.deprecated;
      }
      delete def.deprecated;
    }
  }

  private convertSchemas(): void {
    this.spec.definitions = this.spec.components.schemas;

    for (const defName in this.spec.definitions) {
      this.convertSchema(this.spec.definitions[defName], 'response');
    }

    delete this.spec.components.schemas;
  }

  private convertDiscriminatorMapping(mapping: any): void {
    for (const payload in mapping) {
      const schemaNameOrRef = mapping[payload];
      if (typeof schemaNameOrRef !== 'string') {
        console.warn(`Ignoring ${schemaNameOrRef} for ${payload} in discriminator.mapping.`);
        continue;
      }

      let schema: any;
      if (/^[a-zA-Z0-9._-]+$/.test(schemaNameOrRef)) {
        try {
          schema = this.resolveReference(
            this.spec,
            { $ref: `#/components/schemas/${schemaNameOrRef}` },
            false
          );
        } catch (err) {
          console.debug(
            `Error resolving ${schemaNameOrRef} for ${payload} as schema name in discriminator.mapping: ${err}`
          );
        }
      }

      if (!schema) {
        try {
          schema = this.resolveReference(this.spec, { $ref: schemaNameOrRef }, false);
        } catch (err) {
          console.debug(
            `Error resolving ${schemaNameOrRef} for ${payload} in discriminator.mapping: ${err}`
          );
        }
      }

      if (schema) {
        schema['x-discriminator-value'] = payload;
        schema['x-ms-discriminator-value'] = payload;
      } else {
        console.warn(
          `Unable to resolve ${schemaNameOrRef} for ${payload} in discriminator.mapping.`
        );
      }
    }
  }

  private convertSecurityDefinitions(): void {
    this.spec.securityDefinitions = this.spec.components.securitySchemes;
    for (const secKey in this.spec.securityDefinitions) {
      const security = this.spec.securityDefinitions[secKey];
      if (security.type === 'http' && security.scheme === 'basic') {
        security.type = 'basic';
        delete security.scheme;
      } else if (security.type === 'http' && security.scheme === 'bearer') {
        security.type = 'apiKey';
        security.name = 'Authorization';
        security.in = 'header';
        delete security.scheme;
        delete security.bearerFormat;
      } else if (security.type === 'oauth2') {
        const flowName = Object.keys(security.flows)[0];
        const flow = security.flows[flowName];

        if (flowName === 'clientCredentials') {
          security.flow = 'application';
        } else if (flowName === 'authorizationCode') {
          security.flow = 'accessCode';
        } else {
          security.flow = flowName;
        }
        security.authorizationUrl = flow.authorizationUrl;
        security.tokenUrl = flow.tokenUrl;
        security.scopes = flow.scopes;
        delete security.flows;
      }
    }
    delete this.spec.components.securitySchemes;
  }

  private isJsonMimeType(type: string): boolean {
    // Compile regex once instead of creating new instances
    return APPLICATION_JSON_REGEX.test(type);
  }

  private getSupportedMimeTypes(content: any): string[] {
    const MIME_VALUES = Object.keys(SUPPORTED_MIME_TYPES).map(key => {
      return SUPPORTED_MIME_TYPES[key as keyof typeof SUPPORTED_MIME_TYPES];
    });
    return Object.keys(content).filter((key: string) => {
      return MIME_VALUES.indexOf(key) > -1 || this.isJsonMimeType(key);
    });
  }
}
