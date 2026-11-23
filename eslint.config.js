// ESLint (flat config): `npm run lint`.
// JavaScript and TypeScript recommended rules, plus the two core React Hooks rules.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'dist-artifact', 'node_modules', 'public', 'coverage'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Unused values are errors, except deliberately ignored ones written with a leading underscore.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Data importers and build scripts run in Node.
    files: ['scripts/**/*.mjs', '*.config.{js,ts}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node, sourceType: 'module' },
    // `const { a, b, ...rest } = x` is how the build drops fields it doesn't publish.
    rules: { 'no-unused-vars': ['error', { ignoreRestSiblings: true }] },
  },
);
