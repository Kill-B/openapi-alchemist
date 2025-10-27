import * as Yaml from 'js-yaml';
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
  public static parseYAML = (data: string) => Promise.resolve(Yaml.load(data));

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
    if (typeof source === 'object' && source !== null) {
      return 'object';
    }
    if (typeof source !== 'string') {
      return undefined;
    }

    try {
      if (fs.existsSync(source)) return 'file';
    } catch {
      // Ignore file system errors
    }

    if (source.startsWith('./') || source.startsWith('../') || !source.includes('://')) {
      return 'file';
    } else {
      return 'string';
    }
  }

  public static removeNonValues(obj: any): void {
    if (obj === null || typeof obj !== 'object') {
      return;
    }

    if (Array.isArray(obj)) {
      // For arrays, filter out undefined values
      for (let i = obj.length - 1; i >= 0; i--) {
        if (obj[i] === undefined) {
          obj.splice(i, 1);
        } else {
          this.removeNonValues(obj[i]);
        }
      }
    } else {
      // For objects, recursively process and remove undefined properties
      const keys = Object.keys(obj);
      for (const key of keys) {
        if (obj[key] === undefined) {
          delete obj[key];
        } else {
          this.removeNonValues(obj[key]);
        }
      }
    }
  }
}
