const {pathsToModuleNameMapper} = require('ts-jest/utils');
const {compilerOptions} = require('../tsconfig.json');

module.exports = {
  globals: {
    'ts-jest': {
      isolatedModules: true, // Disable typechecking
      tsConfig: compilerOptions,
    },
  },
  modulePaths: ['<rootDir>'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
  preset: 'ts-jest',
  rootDir: process.cwd(),
  testEnvironment: 'node',
};
