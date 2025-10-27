import * as _ from 'lodash';
import { BaseFormat } from '../../types';
import { Util } from '../util';
import { OpenApi3ToSwagger2Converter } from '../converters/openapi3_to_swagger2';

export class OpenApi3 extends BaseFormat {
  public formatName = 'openapi';
  public supportedVersions = ['3.0'];

  constructor(spec?: any) {
    super(spec);
    this.format = 'openapi_3';

    this.converters['swagger_2'] = (oa: OpenApi3) => {
      const converter = new OpenApi3ToSwagger2Converter(oa);
      return Promise.resolve(converter.convert());
    };
  }

  public getFormatVersion(): string {
    const versionComponents = this.spec.openapi.split('.');
    return versionComponents[0] + '.' + versionComponents[1];
  }

  public fillMissing(dummyData?: any): void {
    dummyData = dummyData || {
      info: {
        title: '< An API title here >',
        version: '< An API version here >'
      }
    };

    this.spec = _.merge(dummyData, this.spec);
  }

  protected parsers = {
    'JSON': Util.parseJSON,
    'YAML': Util.parseYAML
  };

  public checkFormat(spec: any): boolean {
    return !_.isUndefined(spec.openapi);
  }

  public validate(callback?: (err: any, result: any) => void): Promise<any> {
    const result = Promise.resolve({ errors: null, warnings: null });
    if (callback) {
      result.then(result => callback(null, result)).catch(err => callback(err, null));
    }
    return result;
  }

  protected fixSpec(): void {
    // OpenAPI 3 specific fixes can be added here
  }
}