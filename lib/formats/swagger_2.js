'use strict';

var _ = require('lodash');
var Inherits = require('util').inherits;
var Promise = require('bluebird');

var BaseFormat = require('../base_format.js');
var Util = require('../util.js');

var Swagger2 = module.exports = function() {
  Swagger2.super_.apply(this, arguments);
  this.format = 'swagger_2';
}

Inherits(Swagger2, BaseFormat);

Swagger2.prototype.formatName = 'swagger';
Swagger2.prototype.supportedVersions = ['2.0'];
Swagger2.prototype.getFormatVersion = function () {
  return this.spec.swagger;
}

Swagger2.prototype.fixSpec = function () {
  var swagger = this.spec;

  //Typical mistake is to make version number insted of string
  var version = _.get(swagger, 'info.version');
  if (_.isNumber(version))
    swagger.info.version = version % 1 ? version.toString() : version.toFixed(1);

  Util.removeNonValues(swagger);

  var basePath = swagger.basePath
  if (_.isString(basePath)) {
    // Simple path normalization
    swagger.basePath = basePath.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  _.each(swagger.definitions, function (schema) {
    if (!_.isUndefined(schema.id))
      delete schema.id;
  });
};

Swagger2.prototype.fillMissing = function (dummyData) {
  dummyData = dummyData || {
    info: {
      title: '< An API title here >',
      version: '< An API version here >'
    }
  };

  this.spec = _.merge(dummyData, this.spec);
}

Swagger2.prototype.parsers = {
  'JSON': Util.parseJSON,
  'YAML': Util.parseYAML
};

Swagger2.prototype.checkFormat = function (spec) {
  return !_.isUndefined(spec.swagger);
}

Swagger2.prototype.validate = function (callback) {
  return Promise.resolve({errors: null, warnings: null})
    .asCallback(callback);
};
