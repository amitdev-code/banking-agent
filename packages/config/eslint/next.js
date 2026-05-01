/** @type {import('eslint').Linter.Config} */
const base = require('./index');

module.exports = {
  ...base,
  extends: [
    ...base.extends,
    'next/core-web-vitals',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  plugins: [...(base.plugins ?? []), 'react', 'react-hooks', 'jsx-a11y'],
  rules: {
    ...base.rules,
    // React specific
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/require-default-props': 'off',
    'react/jsx-props-no-spreading': 'off',
    'react/function-component-definition': [
      'error',
      { namedComponents: 'function-declaration', unnamedComponents: 'arrow-function' },
    ],
    // Next.js: allow both named and default exports on pages
    'import/prefer-default-export': 'off',
    // Explicit return types not required for React components (JSX inference)
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
  settings: {
    ...base.settings,
    react: { version: 'detect' },
  },
};
