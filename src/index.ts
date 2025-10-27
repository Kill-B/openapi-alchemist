import * as _ from 'lodash';
import { ConvertOptions, ConvertResult, BaseFormat, Util } from './types';
import { OpenApi3 } from './lib/formats/openapi_3';
import { Swagger2 } from './lib/formats/swagger_2';

// Register formats
const Formats: { [key: string]: any } = {};
Formats['swagger_2'] = Swagger2;
Formats['openapi_3'] = OpenApi3;

// Make formats available globally for the convertTo method
(global as any).Formats = Formats;

const Converter = {
  Formats,
  BaseFormat,
  ResourceReaders: Util.resourceReaders,

  getSpec(source: string | object, format: string, callback?: (err: any, result: BaseFormat) => void): Promise<BaseFormat> {
    if (!Formats.hasOwnProperty(format)) {
      throw new Error('Unknown format ' + format + ', you might have forgotten installing an optional dependency');
    }
    const FormatClass = Formats[format];
    const spec = new FormatClass();
    const result = spec.resolveResources(source).then(() => spec);
    
    if (callback) {
      result.then(result => callback(null, result)).catch(err => callback(err, null));
    }
    return result;
  },

  getFormatName(name: string, version: string): string | undefined {
    let result: string | undefined;
    _.each(Formats, (format: any, formatName: string) => {
      const formatPrototype = format.prototype;
      if (formatPrototype.formatName === name && formatPrototype.supportedVersions.indexOf(version) !== -1) {
        result = formatName;
      }
    });
    return result;
  },

  convert(options: ConvertOptions, callback?: (err: any, result: ConvertResult) => void): Promise<ConvertResult> {
    const result = Converter.getSpec(options.source, options.from)
      .then((fromSpec: BaseFormat) => fromSpec.convertTo(options.to, options.passthrough));
    
    if (callback) {
      result.then(result => callback(null, result)).catch(err => callback(err, null));
    }
    return result;
  }
};

export = Converter;