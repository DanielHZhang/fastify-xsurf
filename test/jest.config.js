const {pathsToModuleNameMapper} = require('ts-jest/utils');
// In the following statement, replace `./tsconfig` with the path to your `tsconfig` file
// which contains the path mapping (ie the `compilerOptions.paths` option):
const {compilerOptions} = require('../tsconfig.json');

module.exports = {
  globals: {
    'ts-jest': {
      isolatedModules: true, // Disable typechecking
    },
  },
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
  preset: 'ts-jest',
  rootDir: process.cwd(),
  testEnvironment: 'node',
};
