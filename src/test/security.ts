import * as Converter from '../index';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';

const SECRET = 'TOP-SECRET-VALUE-7f3a';

function prototypeSnapshot(): string {
  return JSON.stringify(
    Object.getOwnPropertyNames(Object.prototype)
      .sort()
      .map(name => [name, typeof (Object.prototype as any)[name]])
  );
}

function spec(extra: any = {}): any {
  return { openapi: '3.0.0', info: { title: 't', version: '1' }, paths: {}, ...extra };
}

function responseRef(ref: string): any {
  return spec({
    paths: {
      '/x': {
        get: {
          responses: {
            '200': {
              description: 'ok',
              content: { 'application/json': { schema: { $ref: ref } } },
            },
          },
        },
      },
    },
  });
}

function convert(source: any, refRoot?: string) {
  const options: any = { from: 'openapi_3', to: 'swagger_2', source };
  if (refRoot !== undefined) options.refRoot = refRoot;
  return Converter.convert(options);
}

function assertNoSecret(value: unknown): void {
  assert.ok(!JSON.stringify(value ?? null).includes(SECRET), 'secret content leaked');
}

async function assertRejectsNaming(promise: Promise<unknown>, needle: string): Promise<Error> {
  let caught: any;
  try {
    const result = await promise;
    assertNoSecret((result as any)?.spec);
    assert.fail('conversion should have failed');
  } catch (err) {
    caught = err;
  }
  assert.ok(caught instanceof Error, 'expected an Error');
  assert.ok(!(caught instanceof TypeError), `unexpected TypeError: ${caught.message}`);
  assert.ok(caught.message.includes(needle), `"${caught.message}" should name ${needle}`);
  assert.ok(!caught.message.includes(SECRET), 'secret content leaked in the error');
  return caught;
}

let tmp: string;
let specDir: string;
let outsideFile: string;
let insideFile: string;

before(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'alchemist-')));
  specDir = path.join(tmp, 'specs');
  fs.mkdirSync(path.join(specDir, 'sub'), { recursive: true });
  outsideFile = path.join(tmp, 'outside.json');
  fs.writeFileSync(outsideFile, JSON.stringify({ type: 'string', description: SECRET }));
  insideFile = path.join(specDir, 'inside.json');
  fs.writeFileSync(
    insideFile,
    JSON.stringify({ type: 'object', properties: { id: { type: 'integer' } } })
  );
  fs.symlinkSync(outsideFile, path.join(specDir, 'link.json'));
});

after(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function writeSpec(name: string, body: any): string {
  const file = path.join(specDir, name);
  fs.writeFileSync(file, JSON.stringify(body));
  return file;
}

describe('external $ref confinement', () => {
  test('a ../ reference outside the spec directory fails without leaking content', async () => {
    const file = writeSpec('sub/traversal.json', responseRef('../../outside.json'));
    await assertRejectsNaming(convert(file), '../../outside.json');
  });

  test('an absolute reference outside the spec directory fails', async () => {
    const file = writeSpec('absolute-out.json', responseRef(outsideFile));
    await assertRejectsNaming(convert(file), outsideFile);
  });

  test('a symbolic link inside the directory that targets a file outside fails', async () => {
    const file = writeSpec('symlink.json', responseRef('link.json'));
    await assertRejectsNaming(convert(file), 'link.json');
  });

  test('an absolute reference inside the root resolves', async () => {
    const file = writeSpec('absolute-in.json', responseRef(insideFile));
    const result: any = await convert(file);
    assert.strictEqual(result.spec.paths['/x'].get.responses['200'].schema.type, 'object');
  });

  test('refRoot that contains the target inlines it', async () => {
    const file = writeSpec('sub/widened.json', responseRef('../../outside.json'));
    const result: any = await convert(file, tmp);
    assert.strictEqual(result.spec.paths['/x'].get.responses['200'].schema.type, 'string');
  });

  test('a target outside refRoot still fails', async () => {
    const file = writeSpec('sub/narrow.json', responseRef('../../outside.json'));
    await assertRejectsNaming(convert(file, specDir), '../../outside.json');
  });
});

describe('refRoot validation', () => {
  for (const [label, refRoot] of [
    ['relative', 'specs'],
    ['missing', '/definitely/not/here/alchemist'],
    ['a file', '__FILE__'],
  ] as const) {
    test(`a refRoot that is ${label} fails before any file is read`, async () => {
      const value = refRoot === '__FILE__' ? outsideFile : refRoot;
      const missingSource = path.join(tmp, 'never-read.json');
      const err = await assertRejectsNaming(convert(missingSource, value), 'refRoot');
      assert.ok(!err.message.includes('never-read.json'));
    });
  }

  test('getSpec accepts { refRoot } as its fourth argument', async () => {
    const file = writeSpec('sub/getspec.json', responseRef('../../outside.json'));
    const spec: any = await Converter.getSpec(file, 'openapi_3', undefined, { refRoot: tmp });
    const result: any = await spec.convertTo('swagger_2');
    assert.strictEqual(result.spec.paths['/x'].get.responses['200'].schema.type, 'string');
    const narrow: any = await Converter.getSpec(file, 'openapi_3', undefined, {
      refRoot: specDir,
    });
    await assertRejectsNaming(
      Promise.resolve().then(() => narrow.convertTo('swagger_2')),
      '../../outside.json'
    );
    await assertRejectsNaming(
      Converter.getSpec(file, 'openapi_3', undefined, { refRoot: 'relative' }),
      'refRoot'
    );
  });

  test('an object source with refRoot resolves relative refs against refRoot', async () => {
    const result: any = await convert(responseRef('inside.json'), specDir);
    assert.strictEqual(result.spec.paths['/x'].get.responses['200'].schema.type, 'object');
    await assertRejectsNaming(convert(responseRef('../outside.json'), specDir), '../outside.json');
  });

  test('a string source with refRoot resolves relative refs against refRoot', async () => {
    const body = spec({
      servers: [{ url: 'https://api.example.com/v1' }],
      paths: responseRef('inside.json').paths,
    });
    const result: any = await convert(JSON.stringify(body), specDir);
    assert.strictEqual(result.spec.paths['/x'].get.responses['200'].schema.type, 'object');
    const outside = { ...body, paths: responseRef('../outside.json').paths };
    await assertRejectsNaming(convert(JSON.stringify(outside), specDir), '../outside.json');
  });

  test('an object source without refRoot still rejects external refs', async () => {
    await assertRejectsNaming(convert(responseRef('inside.json')), 'Remote $ref');
  });
});

describe('$ref resolution never touches Object.prototype', () => {
  const guarded = ['#/__proto__', '#/constructor/prototype', '#/components/schemas/constructor'];

  for (const ref of guarded) {
    test(`a resolved $ref through ${ref} fails with a named error`, async () => {
      const before = prototypeSnapshot();
      const body = responseRef(ref);
      body.components = { schemas: {} };
      await assertRejectsNaming(convert(body), ref);
      assert.strictEqual(prototypeSnapshot(), before);
    });
  }

  test('a resolved parameter $ref through __proto__ fails with a named error', async () => {
    const before = prototypeSnapshot();
    const body = spec({
      paths: { '/x': { get: { parameters: [{ $ref: '#/__proto__/x' }], responses: {} } } },
    });
    await assertRejectsNaming(convert(body), '#/__proto__/x');
    assert.strictEqual(prototypeSnapshot(), before);
  });

  test('an external $ref fragment through __proto__ fails with a named error', async () => {
    const before = prototypeSnapshot();
    const file = writeSpec('fragment.json', responseRef('inside.json#/__proto__'));
    await assertRejectsNaming(convert(file), 'inside.json#/__proto__');
    assert.strictEqual(prototypeSnapshot(), before);
  });

  test('discriminator.mapping entries that do not resolve are skipped with a warning', async t => {
    const warn = t.mock.method(console, 'warn', () => {});
    t.mock.method(console, 'debug', () => {});
    const before = prototypeSnapshot();
    const mapping = {
      POLLUTED: '__proto__',
      CTOR: 'constructor',
      PROTO: '#/components/schemas/prototype',
      FRAGMENT: 'inside.json#/__proto__',
      MISSING: 'Nope',
    };
    const body = spec({
      components: {
        schemas: { Pet: { type: 'object', discriminator: { propertyName: 'k', mapping } } },
      },
    });
    const file = writeSpec('mapping.json', body);
    const result: any = await convert(file);
    assert.strictEqual(prototypeSnapshot(), before);
    assert.strictEqual(({} as any)['x-discriminator-value'], undefined);
    assert.strictEqual(result.spec.definitions.Pet.discriminator, 'k');
    const messages = warn.mock.calls.map(call => String(call.arguments[0]));
    for (const [payload, target] of Object.entries(mapping)) {
      assert.ok(
        messages.some(m => m.includes(target) && m.includes(payload)),
        `no warning for ${payload}`
      );
    }
  });
});

describe('unresolvable $ref', () => {
  test('a missing last segment fails with a named error', async () => {
    const body = responseRef('#/components/schemas/Missing');
    body.components = { schemas: {} };
    await assertRejectsNaming(convert(body), '#/components/schemas/Missing');
  });

  test('a missing middle segment fails with a named error', async () => {
    const body = spec({
      paths: {
        '/x': { get: { parameters: [{ $ref: '#/components/nope/Id' }], responses: {} } },
      },
    });
    await assertRejectsNaming(convert(body), '#/components/nope/Id');
  });
});

describe('public exports', () => {
  test('exports the same members as 1.0.1', () => {
    const exported = Object.keys(Converter).filter(key => key !== 'default');
    assert.deepStrictEqual(exported.sort(), [
      'BaseFormat',
      'Formats',
      'ResourceReaders',
      'convert',
      'getFormatName',
      'getSpec',
    ]);
  });
});
