import {plugin as shadcn} from '@shadcn/lint';
import tsParser from '@typescript-eslint/parser';
import {defineConfig} from 'eslint/config';

export default defineConfig([
  {ignores: ['client/src/components/ui/**']},
  {
    files: ['client/src/**/*.{ts,tsx}'],
    languageOptions: {parser: tsParser, parserOptions: {ecmaFeatures: {jsx: true}}},
    plugins: {shadcn},
    rules: {
      'shadcn/no-restyle': ['error', {allow: ['layout']}],
      'shadcn/no-raw-colors': 'error',
      'shadcn/no-arbitrary-values': 'error',
      'shadcn/no-inline-styles': 'error',
      'shadcn/no-unknown-classes': 'error',
      'shadcn/require-static-classes': 'error',
    },
  },
]);
