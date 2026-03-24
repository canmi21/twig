/* eslint.config.mjs */

import tseslint from 'typescript-eslint'
import oxlint from 'eslint-plugin-oxlint'
import reactHooks from 'eslint-plugin-react-hooks'
import tailwindcss from 'eslint-plugin-better-tailwindcss'

export default [
  {
    ignores: [
      'dist',
      'build',
      'node_modules',
      'coverage',
      '**/*.gen.*',
      'public',
      'reference',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // React Compiler rules — oxlint cannot cover these
      'react-hooks/purity': 'error',
      'react-hooks/refs': 'error',
      'react-hooks/set-state-in-render': 'error',
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/immutability': 'error',
      'react-hooks/preserve-manual-memoization': 'error',
      'react-hooks/error-boundaries': 'error',
      'react-hooks/static-components': 'error',
      'react-hooks/component-hook-factories': 'error',
      'react-hooks/unsupported-syntax': 'warn',
      'react-hooks/use-memo': 'error',
    },
  },
  {
    ...tailwindcss.configs.recommended,
    rules: {
      ...tailwindcss.configs.recommended.rules,
      // Conflicts with oxfmt JSX attribute line-breaking
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
    },
    settings: {
      ...tailwindcss.configs.recommended.settings,
      'better-tailwindcss': {
        entryPoint: 'src/styles/app.css',
      },
    },
  },
  // Auto-disable rules already covered by oxlint
  ...oxlint.buildFromOxlintConfigFile('.oxlintrc.json'),
]
