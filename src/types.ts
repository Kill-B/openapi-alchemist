import * as _ from 'lodash';
import * as SortObject from 'deep-sort-object';
import * as Yaml from 'js-yaml';
import * as traverse from 'traverse';

export interface ConvertOptions {
  from: 'openapi_3';
  to: 'swagger_2' | 'openapi_3';
  source: string | object;
  syntax?: 'json' | 'yaml';
  order?: 'openapi' | 'alpha' | 'false';
  passthrough?: any;
}

export interface ConvertResult {
  spec: any;
  stringify(options?: StringifyOptions): string;
}

export interface StringifyOptions {
  syntax?: 'json' | 'yaml';
  order?: 'openapi' | 'alpha' | 'false';
}

export interface ValidationResult {
  errors: any[] | null;
  warnings: any[] | null;
}

export interface ResourceReaders {
  file: (filename: string) => Promise<string>;
  object: (data: any) => Promise<any>;
  string: (data: string) => Promise<string>;
}

export abstract class BaseFormat {
  public spec: any;
  public format: string;
  public converters: { [key: string]: (spec: BaseFormat, passthrough?: any) => Promise<any> };
  public sourceType?: string;
  public source?: string;
  public subResources?: { [key: string]: any };

  constructor(spec?: any) {
    if (spec) this.spec = spec;
    this.format = "base_format";
    this.converters = {};
  }

  abstract formatName: string;
  abstract supportedVersions: string[];
  abstract getFormatVersion(): string;
  abstract checkFormat(spec: any): boolean;

  public stringify(options?: StringifyOptions): string {
    const syntax = options?.syntax || 'json';
    const order = options?.order || 'openapi';

    let sortedSpecs: any;
    if (order === 'false') {
      sortedSpecs = this.spec;
    } else {
      const attr = [
        'externalDocs',
        'tags',
        'security',
        'securityDefinitions',
        'responses',
        'parameters',
        'definitions',
        'components',
        'paths',
        'produces',
        'consumes',
        'schemes',
        'basePath',
        'host',
        'servers',
        'info',
        'swagger',
        'openapi',
      ];

      sortedSpecs = SortObject(this.spec, (a: string, b: string) => {
        let aIdx = -1;
        let bIdx = -1;

        if (order !== 'alpha') {
          aIdx = attr.indexOf(a);
          bIdx = attr.indexOf(b);
        }

        if (aIdx === -1 && bIdx === -1) {
          if (a === b) return 0;
          return (a < b) ? -1 : 1;
        }

        if (aIdx === bIdx) return 0;
        return aIdx < bIdx ? 1 : -1;
      });
    }

    if (syntax === "yaml") {
      return Yaml.safeDump(sortedSpecs);
    } else {
      return JSON.stringify(sortedSpecs, null, 2);
    }
  }

  public fillMissing(dummyData?: any): void {
    // Default implementation - can be overridden
  }

  public validate(callback?: (err: any, result: ValidationResult) => void): Promise<ValidationResult> {
    const result = Promise.resolve({ errors: null, warnings: null });
    if (callback) {
      result.then(result => callback(null, result)).catch(err => callback(err, null));
    }
    return result;
  }

  public listSubResources(): { [key: string]: string } {
    return {};
  }

  public resolveSubResources(): Promise<void> {
    const sources = this.listSubResources();
    return Promise.all(_.values(sources).map((url: string) => this.readSpec(url)))
      .then((resources: any[]) => {
        const refs = _.keys(sources);
        this.subResources = _.zipObject(refs, resources);
      });
  }

  public parse(data: any): Promise<any> {
    if (!_.isString(data)) {
      return Promise.resolve(data);
    }

    const parsePromises = _.map(this.parsers, (parser: (data: string) => Promise<any>) => 
      parser(data).catch((err: any) => {
        // Return a rejected promise that won't be caught by Promise.any
        return Promise.reject(err);
      })
    );

    // Use a more compatible approach for Promise.any
    return Promise.allSettled(parsePromises).then((results) => {
      const successful = results.find(result => result.status === 'fulfilled');
      if (successful) {
        return (successful as PromiseFulfilledResult<any>).value;
      }
      
      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason);
      
      throw new Error('Failed to parse spec: ' + errors.map((e: any) => e.message).join(', '));
    });
  }

  public readSpec(source: string | object): Promise<[any, string]> {
    const sourceType = Util.getSourceType(source);

    if (!sourceType) {
      throw new Error('Spec source should be object, string, or filename.');
    }

    return Util.resourceReaders[sourceType](source)
      .then((data: any) => this.parse(data))
      .then((spec: any) => [spec, sourceType]);
  }

  public resolveResources(source: string | object): Promise<void> {
    return this.readSpec(source)
      .then(([spec, sourceType]) => {
        if (!this.checkFormat(spec)) {
          throw new Error(sourceType + ' ' + source + ' is not valid ' + this.format);
        }

        this.spec = spec;
        this.sourceType = sourceType;
        if (sourceType === 'file') {
          this.source = source as string;
        }
      })
      .then(() => this.resolveSubResources())
      .then(() => {
        this.fixSpec();

        const version = this.getFormatVersion();
        if (this.supportedVersions.indexOf(version) === -1) {
          throw new Error('Unsupported version');
        }
      });
  }

  public convertTo(format: string, passthrough?: any, callback?: (err: any, result: BaseFormat) => void): Promise<BaseFormat> {
    if (format === this.format) {
      const result = Promise.resolve(this);
      if (callback) {
        result.then(result => callback(null, result)).catch(err => callback(err, null));
      }
      return result;
    }

    const convert = this.converters[format];
    if (!convert) {
      const error = new Error(`Unable to convert from ${this.format} to ${format}`);
      if (callback) {
        callback(error, null);
        return Promise.resolve(this);
      }
      return Promise.reject(error);
    }

    const result = convert(this, passthrough)
      .then((spec: any): BaseFormat => {
        // This will be set by the formats registry
        const FormatClass = (global as any).Formats?.[format];
        if (!FormatClass) {
          throw new Error(`Format ${format} not found in registry`);
        }
        const result = new FormatClass(spec);
        result.fixSpec();
        return result;
      }, (err: any) => {
        err.message = 'Error during conversion: ' + err.message;
        throw err;
      });
    
    if (callback) {
      result.then(result => callback(null, result)).catch(err => callback(err, null));
    }
    return result;
  }

  public convertTransitive(intermediaries: string[], passthrough?: any): Promise<any> {
    let prom: Promise<BaseFormat> = Promise.resolve(this);
    intermediaries.forEach(intermediary => {
      prom = prom.then((spec: BaseFormat) => {
        return spec.convertTo(intermediary, passthrough);
      });
    });
    return prom.then((spec: BaseFormat) => spec.spec);
  }

  protected abstract parsers: { [key: string]: (data: string) => Promise<any> };
  protected abstract fixSpec(): void;
}

export class Util {
  public static joinPath(...args: string[]): string {
    return args.join('/').replace(/\/\/+/g, '/');
  }

  public static parseJSON = (data: string) => {
    try {
      return Promise.resolve(JSON.parse(data));
    } catch (err) {
      return Promise.reject(err);
    }
  };
  public static parseYAML = (data: string) => Promise.resolve(Yaml.safeLoad(data));

  public static resourceReaders: ResourceReaders = {
    file: (filename: string) => {
      return new Promise((resolve, reject) => {
        require('fs').readFile(filename, 'utf8', (err: any, data: string) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    },
    object: (data: any) => Promise.resolve(data),
    string: (data: string) => Promise.resolve(data),
  };

  public static getSourceType(source: any): string | undefined {
    if (_.isObject(source)) {
      return 'object';
    }
    if (!_.isString(source)) {
      return undefined;
    }

    try {
      if (require('fs').existsSync(source)) return 'file';
    } catch (e) {}

    if (source.startsWith('./') || source.startsWith('../') || !source.includes('://')) {
      return 'file';
    } else {
      return 'string';
    }
  }

  public static removeNonValues(obj: any): void {
    const traverse = require('traverse');
    traverse(obj).forEach(function (this: any, value: any) {
      if (value === undefined) {
        this.remove();
      }
    });
  }
}