import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'js-yaml';
import { expect } from 'chai';

declare global {
  var getFileName: (dir: string, testCase: any) => string;
  var getFile: (file: string, cb: (err: any, content: any) => void) => void;
  var getFileRaw: (file: string, cb: (err: any, content: string) => void) => void;
  var expect: any;
  var FS: typeof fs;
  var WRITE_GOLDEN: boolean;
  var Converter: any;
  var TestSuites: any;
  var TestCases: any;
  var SyntaxTestCases: any;
}

global.getFileName = function(dir: string, testCase: any): string {
  return path.join(__dirname, '..', '..', 'test', dir, testCase.format, testCase.directory || '', testCase.file);
}

// returns file content as a JavaScript
global.getFile = function(file: string, cb: (err: any, content: any) => void): void {
  const content = fs.readFileSync(file, 'utf8');
  const parsed = file.endsWith('json') ? JSON.parse(content) : YAML.load(content);
  cb(null, parsed);
}

// returns file content as a string
global.getFileRaw = function(file: string, cb: (err: any, content: string) => void): void {
  cb(null, fs.readFileSync(file, 'utf8'));
}

global.expect = expect;
global.FS = fs;

global.WRITE_GOLDEN = !!process.env.WRITE_GOLDEN;
global.Converter = require('../../index.js');

const TestSuites = require('../test-cases.js');
global.TestCases = TestSuites.TestCases;
global.SyntaxTestCases = TestSuites.SyntaxTestCases;

