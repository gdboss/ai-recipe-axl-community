module.exports = {
  root: true,
  extends: 'airbnb-base',
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
  },
  overrides: [
    {
      // design token tooling and tests run in Node, never in the browser
      files: ['tools/design-tokens/**/*.mjs', 'test/design-tokens/**/*.mjs'],
      env: { browser: false, node: true },
      rules: {
        'import/extensions': ['error', { mjs: 'always' }],
        'import/prefer-default-export': 'off',
        // stylelint is ESM-only; eslint-plugin-import can't resolve its exports map
        'import/no-unresolved': ['error', { ignore: ['^stylelint$'] }],
      },
    },
    {
      files: ['tools/design-tokens/build-tokens.mjs'],
      rules: { 'no-console': 'off' }, // it's a CLI
    },
  ],
};
