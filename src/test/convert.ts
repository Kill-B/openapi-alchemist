import * as Converter from '../index';
import * as fs from 'fs';
import * as path from 'path';
import { TestCases, SyntaxTestCases } from './test-cases';

const isBrowser = typeof window === 'object';

if (!isBrowser) {
  require('./setup/node');
} else {
  require('./setup/browser');
}

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
    if (isBrowser && testCase.skipBrowser) return;
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
    if (!isBrowser) {
      expect({}.should).to.be.undefined;
    }
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
