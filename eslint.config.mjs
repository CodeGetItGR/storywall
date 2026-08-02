import { defineConfig, globalIgnores } from 'eslint/config';
import nextConfig from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier/flat';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

export default defineConfig([
    ...nextConfig,
    ...nextTypeScript,

    {
        plugins: {
            'simple-import-sort': simpleImportSort,
            'unused-imports': unusedImports,
        },

        rules: {
            /*
             * Import organization
             */
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',

            /*
             * Remove unused imports automatically.
             *
             * We disable the standard rule to prevent duplicate warnings.
             */
            '@typescript-eslint/no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'error',

            /*
             * Keep unused parameters or variables when their name begins
             * with an underscore.
             *
             * Example:
             * const handler = (_event: Event) => {};
             */
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                },
            ],

            /*
             * Additional sensible project rules
             */
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-debugger': 'error',
            'prefer-const': 'error',
            eqeqeq: ['error', 'always'],
        },
    },

    /*
     * Must come near the end. It disables ESLint formatting rules that
     * could conflict with Prettier.
     */
    prettierConfig,

    globalIgnores(['.next/**', 'node_modules/**', 'coverage/**', 'dist/**', 'out/**', 'next-env.d.ts']),
]);
