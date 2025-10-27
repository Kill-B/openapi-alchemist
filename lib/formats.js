'use strict';

var Formats = module.exports = {};

// Only support OpenAPI 3 and Swagger 2 formats
Formats.swagger_2 = require('./formats/swagger_2.js');
Formats.openapi_3 = require('./formats/openapi_3.js');
