import * as Converter from '../index';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'js-yaml';
import { expect } from 'chai';
import { TestCases, SyntaxTestCases } from './test-cases';

// Node.js specific setup functions
function getFileName(dir: string, testCase: any): string {
  return path.join(__dirname, '..', '..', 'test', dir, testCase.format, testCase.directory || '', testCase.file);
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
  })
    .then((spec: any) => {
      spec.fillMissing();
      return spec;
    });
}

describe('Converter', function() {
  this.timeout(10000);
  TestCases.forEach((testCase: any) => {
    const testName = 'should convert ' + testCase.in.file +
      ' from ' + testCase.in.format + ' to ' + testCase.out.format;
    it(testName, function(done) {
      convertFile(testCase)
        .then((spec: any) => {
          const outfile = getFileName('output', testCase.out);
          const order = testCase.out.order || 'alpha';
          if (WRITE_GOLDEN)
            fs.writeFileSync(outfile, spec.stringify({ order: order, syntax: testCase.out.syntax }) + '\n');

          getFile(outfile, function(err: any, golden: any) {
            try {
              expect(spec.spec).to.deep.equal(golden);
            } catch (e) {
              return done(e);
            }
            done();
          });
        })
        .catch((e: any) => {
          done(e);
        });
    })
  })

  it('should not pull in transitive dependency mutating Object prototype', function () {
    expect({}.should).to.be.undefined;
  });
});

// The "Converter" test suite above validates that all conversions are as expected.
// It focuses on validating that the JavaScript object has the right content.
// It does not check how the object is Marshaled out.
//
// The "Converter & Output Syntax" suite run a few similar tests
// but focuses on validating that the output is json or yaml.
// basically, it tests the various values that can be passed to spec.stringify
describe('Converter & Output Syntax', function() {
  this.timeout(10000);
  SyntaxTestCases.forEach((testCase: any) => {
    const testName = 'should convert ' + testCase.in.file +
      ' from ' + testCase.in.format + ' to ' + testCase.out.format +
      ' and output as ' + testCase.out.syntax +
      ' with ' + testCase.out.order + ' order';

    it(testName, function(done) {
      convertFile(testCase)
        .then((spec: any) => {
          const options = { syntax: testCase.out.syntax, order: testCase.out.order };
          const specAsString = spec.stringify(options) + '\n';
          const outfile = getFileName('output', testCase.out);

          if (WRITE_GOLDEN)
            fs.writeFileSync(outfile, specAsString);

          getFileRaw(outfile, function(err: any, goldenString: string) {
            try {
              expect(specAsString).to.deep.equal(goldenString);
            } catch (e) {
              return done(e);
            }
            done();
          });
        })
        .catch((e: any) => {
          done(e);
        });
    })
  })
});
