import * as Converter from '../index';
import * as path from 'node:path';
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { TestCases } from './test-cases';

function location(url: string, variables: any = {}): Promise<any> {
  const spec = {
    openapi: '3.0.0',
    info: { title: 't', version: '1' },
    servers: [{ url, variables }],
    paths: {},
  };
  return Converter.convert({ from: 'openapi_3', to: 'swagger_2', source: spec }).then(
    (result: any) => ({
      host: result.spec.host,
      schemes: result.spec.schemes,
      basePath: result.spec.basePath,
    })
  );
}

describe('server URL', () => {
  const sameAs101: [string, any, any][] = [
    [
      'https://api.example.com/v1',
      {},
      { host: 'api.example.com', schemes: ['https'], basePath: '/v1' },
    ],
    ['https://api.example.com', {}, { host: 'api.example.com', schemes: ['https'], basePath: '/' }],
    [
      'http://api.example.com:8080/base/path/',
      {},
      { host: 'api.example.com:8080', schemes: ['http'], basePath: '/base/path' },
    ],
    ['/v1', {}, { host: undefined, schemes: undefined, basePath: '/v1' }],
    ['v1', {}, { host: undefined, schemes: undefined, basePath: 'v1' }],
    [
      'https://API.Example.com/V1',
      {},
      { host: 'api.example.com', schemes: ['https'], basePath: '/V1' },
    ],
    [
      '{scheme}://{host}:{port}/{base}',
      {
        scheme: { default: 'https' },
        host: { default: 'api.example.com' },
        port: { default: '8443' },
        base: { default: 'v2' },
      },
      { host: 'api.example.com:8443', schemes: ['https'], basePath: '/v2' },
    ],
  ];

  for (const [url, variables, expected] of sameAs101) {
    test(`${url} converts as in 1.0.1`, async () => {
      assert.deepStrictEqual(await location(url, variables), expected);
    });
  }

  const fallback: [string, any][] = [
    ['https://{host}/v1', { host: {} }],
    ['{scheme}://api.example.com/v1', {}],
    ['http://[::1/v1', {}],
    ['{scheme}://api.example.com/v1?x=1#f', {}],
    ['/v1', {}],
  ];

  for (const [url, variables] of fallback) {
    test(`${url} omits host and schemes and keeps basePath /v1`, async () => {
      assert.deepStrictEqual(await location(url, variables), {
        host: undefined,
        schemes: undefined,
        basePath: '/v1',
      });
    });
  }

  test('a variable name is replaced literally, never read as a pattern', async () => {
    const name = '(a|a)+$';
    const url = 'https://api.example.com/' + 'a'.repeat(10000) + '/{' + name + '}/{a}';
    assert.ok(url.length >= 10000);
    const started = Date.now();
    const result = await location(url, { [name]: { default: 'x' } });
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 1000, `took ${elapsed} ms`);
    assert.ok(result.basePath.endsWith('/x/{a}'), result.basePath.slice(-20));
    assert.ok(!result.basePath.includes(name));
  });

  test('converting the fixtures emits no DEP0169 warning', async () => {
    const warnings: any[] = [];
    const onWarning = (warning: any) => warnings.push(warning);
    process.on('warning', onWarning);
    try {
      for (const testCase of TestCases) {
        const file = path.join(
          __dirname,
          '..',
          '..',
          'test',
          'input',
          testCase.in.format,
          testCase.in.file
        );
        await Converter.convert({ from: 'openapi_3', to: 'swagger_2', source: file });
      }
      await new Promise(resolve => setImmediate(resolve));
    } finally {
      process.off('warning', onWarning);
    }
    assert.deepStrictEqual(
      warnings.filter(w => w.code === 'DEP0169'),
      []
    );
  });
});
