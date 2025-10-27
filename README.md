# API Spec Converter

A minimal and focused API specification converter that supports only the essential conversion workflows.

## Features

This package provides two main functionalities:

1. **OpenAPI 3 → Swagger 2 (OpenAPI 2) conversion**
2. **OpenAPI 3 JSON ↔ YAML format conversion** (semantic preservation, format-only conversion)

## Installation

```bash
npm install api-spec-converter
```

## Usage

### OpenAPI 3 to Swagger 2 Conversion

```javascript
const apiConverter = require('api-spec-converter');

// Convert OpenAPI 3 specification to Swagger 2
apiConverter.convert(
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
const apiConverter = require('api-spec-converter');

// Convert OpenAPI 3 JSON to YAML (format conversion only)
apiConverter.convert(
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
const apiConverter = require('api-spec-converter');

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

apiConverter.convert(
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

Converts API specifications between supported formats.

#### Parameters

- `options` (Object):
  - `from` (String): Source format (`'openapi_3'`)
  - `to` (String): Target format (`'swagger_2'` or `'openapi_3'`)
  - `source` (String|Object): Source specification (file path or object)
  - `syntax` (String, optional): Output syntax (`'json'` or `'yaml'`, default: `'json'`)
  - `order` (String, optional): Output ordering (`'openapi'`, `'alpha'`, or `'false'`, default: `'openapi'`)

- `callback` (Function): Callback function with signature `(err, result)`

#### Return Value

The callback receives a `result` object with:
- `spec`: The converted specification object
- `stringify(options)`: Method to convert the spec to string format

## Supported Node.js Versions

- Node.js >= 6.0.0

## What's Not Supported

This minimal version does **not** support:
- RAML specifications
- API Blueprint specifications  
- WADL specifications
- Google Discovery documents
- I/O Docs specifications
- Swagger 1.x specifications
- URL-based sources (only file paths and objects)
- Swagger 2 → OpenAPI 3 conversion

## License

MIT