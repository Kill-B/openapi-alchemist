import * as _ from 'lodash';
import { BaseFormat } from '../../types';
import { Util } from '../util';

export class Swagger2 extends BaseFormat {
  public formatName = 'swagger';
  public supportedVersions = ['2.0'];

  constructor(spec?: any) {
    super(spec);
    this.format = 'swagger_2';
  }

  public getFormatVersion(): string {
    return this.spec.swagger;
  }

  protected fixSpec(): void {
    const swagger = this.spec;

    // Typical mistake is to make version number instead of string
    const version = _.get(swagger, 'info.version');
    if (_.isNumber(version)) {
      swagger.info.version = version % 1 ? version.toString() : version.toFixed(1);
    }

    Util.removeNonValues(swagger);

    const basePath = swagger.basePath;
    if (_.isString(basePath)) {
      // Simple path normalization
      swagger.basePath = basePath.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    }

    _.each(swagger.definitions, (schema: any) => {
      if (!_.isUndefined(schema.id)) {
        delete schema.id;
      }
    });
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
    return !_.isUndefined(spec.swagger);
  }

  public validate(callback?: (err: any, result: any) => void): Promise<any> {
    const result = Promise.resolve({ errors: null, warnings: null });
    if (callback) {
      result.then(result => callback(null, result)).catch(err => callback(err, null));
    }
    return result;
  }
}