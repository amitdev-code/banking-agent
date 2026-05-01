/** @type {import('eslint').Linter.Config} */
const base = require('./index');

module.exports = {
  ...base,
  rules: {
    ...base.rules,
    // NestJS uses decorators heavily — these patterns are idiomatic
    '@typescript-eslint/explicit-function-return-type': 'error',
    // NestJS constructors with DI often have no body
    'no-empty-function': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    // NestJS decorators use parameter decorators
    'no-unused-expressions': 'off',
  },
};
