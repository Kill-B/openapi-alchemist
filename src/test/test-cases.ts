interface TestCase {
  in: {
    format: string;
    directory?: string;
    file: string;
  };
  out: {
    format: string;
    file: string;
    syntax?: string;
    order?: string;
  };
  skipBrowser?: boolean;
}

const TestCases: TestCase[] = [];

// OpenAPI 3 to Swagger 2 conversion tests
TestCases.push({
  in: { format: 'openapi_3', file: 'deprecated.yml' },
  out: { format: 'swagger_2', file: 'deprecated.yml' },
  skipBrowser: true,
});

TestCases.push({
  in: { format: 'openapi_3', file: 'petstore.json' },
  out: { format: 'swagger_2', file: 'petstore_from_oas3.json' },
});

TestCases.push({
  in: { format: 'openapi_3', file: 'minimal.json' },
  out: { format: 'swagger_2', file: 'minimal.json' },
});

TestCases.push({
  in: { format: 'openapi_3', file: 'produces.yml' },
  out: { format: 'swagger_2', file: 'produces.json' },
});

TestCases.push({
  in: { format: 'openapi_3', file: 'param_schema_ref.yml' },
  out: { format: 'swagger_2', file: 'param_schema_ref.json' },
});

TestCases.push({
  in: { format: 'openapi_3', file: 'servers.yml' },
  out: { format: 'swagger_2', file: 'servers.json' },
});

TestCases.push({
  in: { format: 'openapi_3', file: 'slash_ref.yml' },
  out: { format: 'swagger_2', file: 'slash_ref.json' },
});

TestCases.push({
  in: { format: 'openapi_3', file: 'has_external_ref.json' },
  out: { format: 'swagger_2', file: 'has_external_ref.json' },
  skipBrowser: true,
});

TestCases.push({
  in: { format: 'openapi_3', file: 'yaml_with_ref.yml' },
  out: { format: 'swagger_2', file: 'yaml_with_ref.yml', syntax: 'yaml' },
  skipBrowser: true,
});

TestCases.push({
  in: { format: 'openapi_3', file: 'common_params.json' },
  out: { format: 'swagger_2', file: 'common_params.json' },
  skipBrowser: true,
});

TestCases.push({
  in: { format: 'openapi_3', file: 'form_param.yml' },
  out: { format: 'swagger_2', file: 'form_param.yml', syntax: 'yaml' },
  skipBrowser: true,
});

TestCases.push({
  in: { format: 'openapi_3', file: 'nullable.yml' },
  out: { format: 'swagger_2', file: 'nullable.yml', syntax: 'yaml' },
  skipBrowser: true,
});

TestCases.push({
  in: { format: 'openapi_3', file: 'nested_oneof.yml' },
  out: { format: 'swagger_2', file: 'nested_oneof.yml', syntax: 'yaml' },
  skipBrowser: true,
});

TestCases.push({
  in: { format: 'openapi_3', file: 'request_response_ref.yml' },
  out: { format: 'swagger_2', file: 'request_response_ref.yml', syntax: 'yaml' },
  skipBrowser: true,
});

TestCases.push({
  in: { format: 'openapi_3', file: 'multiple_ref.yml' },
  out: { format: 'swagger_2', file: 'multiple_ref.json', syntax: 'json' },
  skipBrowser: true,
});

//------------------ Json & Yaml test cases -------------------

const SyntaxTestCases: TestCase[] = [];

SyntaxTestCases.push({
  in: { format: 'openapi_3', file: 'param_schema_ref.yml' },
  out: { format: 'swagger_2', file: 'param_schema_unordered_ref.json', order: 'false' },
});

//---- exports ----

export { TestCases, SyntaxTestCases };
