# OpenAPI Alchemist 🧪

[![CI](https://github.com/Kill-B/openapi-alchemist/actions/workflows/ci.yml/badge.svg)](https://github.com/Kill-B/openapi-alchemist/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@killb/openapi-alchemist.svg)](https://www.npmjs.com/package/@killb/openapi-alchemist)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> ⚠️ **Disclaimer**: This is a fork of [LucyBot-Inc/api-spec-converter](https://github.com/LucyBot-Inc/api-spec-converter), converted to TypeScript and focused on OpenAPI 3 to Swagger 2 conversion. For the original full-featured converter supporting multiple formats, please visit the [original repository](https://github.com/LucyBot-Inc/api-spec-converter).

**Transform OpenAPI 3 to Swagger 2 with alchemical precision** ✨

A TypeScript-converted minimal and focused API specification transformer that converts OpenAPI 3 to Swagger 2 with surgical accuracy.

## Features

This package provides two main functionalities:

1. **OpenAPI 3 → Swagger 2 transformation** ✨
2. **OpenAPI 3 JSON ↔ YAML format conversion** (semantic preservation, format-only conversion)

This version has been converted to TypeScript for Node.js v22+ with modern Promise-based APIs and improved type safety.

## Installation

```bash
npm install @killb/openapi-alchemist
```

This package used to be published as `openapi-alchemist`. That name is deprecated and gets no new versions; see [Migrating from 1.x](#migrating-from-1x).

## Usage

### OpenAPI 3 to Swagger 2 Conversion

```javascript
const openapiAlchemist = require('@killb/openapi-alchemist');

// Transform OpenAPI 3 specification to Swagger 2
openapiAlchemist.convert(
  {
    syntax: 'yaml',
    order: 'openapi',
    from: 'openapi_3',
    to: 'swagger_2',
    source: './path/to/your/openapi3.yaml', // or object
  },
  function (err, converted) {
    if (err) {
      console.error('Error converting:', err);
      return;
    }
    
    // Output as YAML
    const yamlString = converted.stringify({syntax: 'yaml'});
    console.log(yamlString);
    
    // Output as JSON
    const jsonString = converted.stringify({syntax: 'json'});
    console.log(jsonString);
  }
);
```

### OpenAPI 3 JSON to YAML Conversion

```javascript
const openapiAlchemist = require('@killb/openapi-alchemist');

// Transform OpenAPI 3 JSON to YAML (format conversion only)
openapiAlchemist.convert(
  {
    syntax: 'yaml',
    order: 'openapi',
    from: 'openapi_3',
    to: 'openapi_3', // Same format, different syntax
    source: './path/to/your/openapi3.json',
  },
  function (err, converted) {
    if (err) {
      console.error('Error converting:', err);
      return;
    }
    
    // Output as YAML
    const yamlString = converted.stringify({syntax: 'yaml'});
    console.log(yamlString);
  }
);
```

### Using with Objects

```javascript
const openapiAlchemist = require('@killb/openapi-alchemist');

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'My API',
    version: '1.0.0'
  },
  paths: {
    '/users': {
      get: {
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    users: {
                      type: 'array',
                      items: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

openapiAlchemist.convert(
  {
    from: 'openapi_3',
    to: 'swagger_2',
    source: openApiSpec, // Direct object
  },
  function (err, converted) {
    if (err) {
      console.error('Error:', err);
      return;
    }
    
    console.log('Converted successfully!');
    console.log('Swagger version:', converted.spec.swagger);
  }
);
```

## API Reference

### `convert(options, callback)`

Transforms API specifications between supported formats.

#### Parameters

- `options` (Object):
  - `from` (String): Source format (`'openapi_3'`)
  - `to` (String): Target format (`'swagger_2'` or `'openapi_3'`)
  - `source` (String|Object): Source specification: a file path, the spec's text, or an object (see [Sources](#sources))
  - `refRoot` (String, optional): Absolute directory that external `$ref` files must stay inside (see [External references](#external-references))
  - `syntax` (String, optional): Output syntax (`'json'` or `'yaml'`, default: `'json'`)
  - `order` (String, optional): Output ordering (`'openapi'`, `'alpha'`, or `'false'`, default: `'openapi'`)

- `callback` (Function): Callback function with signature `(err, result)`

#### Return Value

The callback receives a `result` object with:
- `spec`: The converted specification object
- `stringify(options)`: Method to convert the spec to string format

### `getSpec(source, format, callback?, options?)`

Reads and validates a spec without converting it. `options.refRoot` works as in `convert`. Call `convertTo(format)` on the result to convert it.

## Sources

- **Object**: used as is.
- **String**: read as a **file path** when it has no `://`, starts with `./` or `../`, or names a file that exists. Any other string is parsed as the spec's JSON or YAML text. A spec's text usually contains `://` (in `servers`), but one that doesn't is read as a path.

Do not pass untrusted input as a string: a string can make the converter read a local file. Parse untrusted specs yourself and pass the object.

## External references

A `$ref` to another file (`./schemas/pet.yaml#/Pet`) resolves only to files inside the **reference root**, after resolving `..` and symbolic links. A reference outside the root fails the conversion with an error that names the reference.

- By default the root is the directory of the source file.
- `refRoot` sets another root: an absolute path to an existing directory. Anything else fails the conversion before any file is read.
- With an object or string source, relative references resolve against `refRoot`. Without `refRoot`, external references in an object or string source are not supported.
- Absolute references are allowed when they point inside the root.
- Remote (`http`) references are not supported.

A `$ref` the converter resolves (path items, operations, parameters, request bodies, responses, headers) must point to an existing key, or the conversion fails with an error that names it. References only walk the spec's own keys, never `__proto__`, `constructor` or `prototype`. An unresolvable `discriminator.mapping` entry is skipped with a warning.

## Migrating from 1.x

`@killb/openapi-alchemist` 2.0.0 is the first version under the new name. It has two breaking changes:

1. An external `$ref` that points outside the source file's directory now fails. Pass `refRoot` with a directory that contains it.
2. A resolved `$ref` that points to a missing key now fails with a clear error. 1.x left it dangling or threw a `TypeError`.

It also fixes server URLs: a URL that still holds a `{variable}` with no default, or that is not a valid absolute URL, now converts with `host` and `schemes` left out and `basePath` taken from its path. Server variable names are replaced literally.

## Supported Node.js Versions

- Node.js >= 22.0.0 (TypeScript version with modern Promise APIs)

## What's Not Supported

This minimal version does **not** support:
- RAML specifications
- API Blueprint specifications  
- WADL specifications
- Google Discovery documents
- I/O Docs specifications
- Swagger 1.x specifications
- URL-based sources (only file paths, spec text and objects)
- Remote `$ref` URLs
- Swagger 2 → OpenAPI 3 conversion

## Development

This package is built with TypeScript and compiled to CommonJS for Node.js compatibility. The source code is in the `src/` directory and compiled output is in `dist/`.

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Releases

Versions are published by the `release` workflow on `main`, after CI passes, through npm trusted publishing with a provenance attestation. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/); semantic-release picks the version from them. Nobody publishes from a laptop or with an npm token.

## License

MIT