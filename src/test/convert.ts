import * as Converter from '../index';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'js-yaml';
import { TestCases, SyntaxTestCases } from './test-cases';
import { test, describe } from 'node:test';
import assert from 'node:assert';

// Node.js specific setup functions
function getFileName(dir: string, testCase: any): string {
  return path.join(
    __dirname,
    '..',
    '..',
    'test',
    dir,
    testCase.format,
    testCase.directory || '',
    testCase.file
  );
}

function getFile(file: string, cb: (err: any, content: any) => void): void {
  const content = fs.readFileSync(file, 'utf8');
  const parsed = file.endsWith('json') ? JSON.parse(content) : YAML.load(content);
  cb(null, parsed);
}

function getFileRaw(file: string, cb: (err: any, content: string) => void): void {
  cb(null, fs.readFileSync(file, 'utf8'));
}

const WRITE_GOLDEN = !!process.env.WRITE_GOLDEN;

function convertFile(testCase: any): Promise<any> {
  const infile = getFileName('input', testCase.in);
  return Converter.convert({
    from: testCase.in.format,
    to: testCase.out.format,
    source: infile,
  }).then((spec: any) => {
    spec.fillMissing();
    return spec;
  });
}

describe('Converter', () => {
  TestCases.forEach((testCase: any) => {
    const testName =
      'should convert ' +
      testCase.in.file +
      ' from ' +
      testCase.in.format +
      ' to ' +
      testCase.out.format;
    test(testName, async () => {
      try {
        const spec = await convertFile(testCase);
        const outfile = getFileName('output', testCase.out);
        const order = testCase.out.order || 'alpha';
        if (WRITE_GOLDEN)
          fs.writeFileSync(
            outfile,
            spec.stringify({ order: order, syntax: testCase.out.syntax }) + '\n'
          );

        const golden = await new Promise<any>((resolve, reject) => {
          getFile(outfile, function (err: any, content: any) {
            if (err) reject(err);
            else resolve(content);
          });
        });

        assert.deepStrictEqual(spec.spec, golden);
      } catch (e) {
        throw e;
      }
    });
  });

  test('should not pull in transitive dependency mutating Object prototype', () => {
    assert.strictEqual(({} as any).should, undefined);
  });
});

// The "Converter" test suite above validates that all conversions are as expected.
// It focuses on validating that the JavaScript object has the right content.
// It does not check how the object is Marshaled out.
//
// The "Converter & Output Syntax" suite run a few similar tests
// but focuses on validating that the output is json or yaml.
// basically, it tests the various values that can be passed to spec.stringify
describe('Converter & Output Syntax', () => {
  SyntaxTestCases.forEach((testCase: any) => {
    const testName =
      'should convert ' +
      testCase.in.file +
      ' from ' +
      testCase.in.format +
      ' to ' +
      testCase.out.format +
      ' and output as ' +
      testCase.out.syntax +
      ' with ' +
      testCase.out.order +
      ' order';

    test(testName, async () => {
      try {
        const spec = await convertFile(testCase);
        const options = { syntax: testCase.out.syntax, order: testCase.out.order };
        const specAsString = spec.stringify(options) + '\n';
        const outfile = getFileName('output', testCase.out);

        if (WRITE_GOLDEN) fs.writeFileSync(outfile, specAsString);

        const goldenString = await new Promise<string>((resolve, reject) => {
          getFileRaw(outfile, function (err: any, content: string) {
            if (err) reject(err);
            else resolve(content);
          });
        });

        assert.strictEqual(specAsString, goldenString);
      } catch (e) {
        throw e;
      }
    });
  });
});
