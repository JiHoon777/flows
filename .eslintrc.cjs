const OFF = 0
const WARN = 1
const ERROR = 2

module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended',
  ],
  ignorePatterns: ['dist'],
  parser: '@typescript-eslint/parser',
  plugins: [
    'react-refresh',
    'sort-keys-fix',
    'simple-import-sort',
    'import',
    'jsx-a11y',
    'prettier',
    '@typescript-eslint',
    'react',
    'react-hooks',
  ],
  rules: {
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
      },
    ],
    // import
    'import/no-unresolved': 'off',
    // (This helps configure simple-import-sort) Make sure all imports are at the top of the file
    'import/first': ERROR,

    // (This helps configure simple-import-sort) Make sure there's a newline after the imports
    'import/newline-after-import': ERROR,

    // (This helps configure simple-import-sort) Merge imports of the same file
    'import/no-duplicates': ERROR,

    // This sorts re-exports (`export * from 'foo';`), but not other types of exports.
    'simple-import-sort/exports': ERROR,

    'simple-import-sort/imports': [
      ERROR,
      {
        // The default grouping, but with type imports first as a separate group.
        // See: https://github.com/lydell/eslint-plugin-simple-import-sort/blob/d9a116f71302c5dcfc1581fc7ded8d77392f1924/examples/.eslintrc.js#L122-L133
        groups: [['^.*\\u0000$'], ['^\\u0000'], ['^@?\\w'], ['^'], ['^\\.']],
      },
    ],

    'sort-keys-fix/sort-keys-fix': ERROR,
    
    'jsx-a11y/anchor-is-valid': 'warn',
    'react/react-in-jsx-scope': 'off',
    'react/display-name': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/no-noninteractive-element-interactions': 'off',
    'jsx-a11y/role-supports-aria-props': 'off',
    'react/prop-types': 'off',
    'jsx-a11y/no-noninteractive-tabindex': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-this-alias': 'off',
    'no-constant-condition': 'off',
  },
}
