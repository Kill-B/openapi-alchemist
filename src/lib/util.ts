import * as _ from 'lodash';
import * as Yaml from 'js-yaml';
import * as traverse from 'traverse';
import * as fs from 'fs';

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

  public static resourceReaders = {
    file: (filename: string) => {
      return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf8', (err: any, data: string) => {
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
      if (fs.existsSync(source)) return 'file';
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