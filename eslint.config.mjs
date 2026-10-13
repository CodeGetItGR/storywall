import { defineConfig, globalIgnores } from 'eslint/config';
import nextConfig from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier/flat';
import reactPlugin from 'eslint-plugin-react';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

export default defineConfig([
    ...nextConfig,
    ...nextTypeScript,

    {
        plugins: {
            'simple-import-sort': simpleImportSort,
            'unused-imports': unusedImports,
            react: reactPlugin,
        },

        rules: {
            /*
             * Import organization
             */
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',

            /*
             * No barrel files. Importing one pulls every module it re-exports
             * into the page's JavaScript, used or not. Import the file that
             * defines the thing instead.
             */
            'no-restricted-imports': [
                'error',
                {
                    paths: ['@/hooks', '@/components/playlist', '@/components/reports'].map((name) => ({
                        name,
                        message: 'Import from the file that defines it (e.g. @/hooks/useAuth). Barrel imports ship every re-exported module.',
                    })),
                },
            ],

            /*
             * Ban inline arrow/bind functions passed as JSX props (e.g.
             * onClick={() => ...}). They create a new function every render,
             * defeat memoization, and push logic into markup. Extract a
             * named handler instead.
             */
            'react/jsx-no-bind': [
                'error',
                {
                    ignoreDOMComponents: false,
                    ignoreRefs: false,
                    allowArrowFunctions: false,
                    // Named handler functions (`function handleClick() {}`) are
                    // fine — they keep JSX readable. Only arrow-function/bind
                    // *literals* written inline in a prop are banned.
                    allowFunctions: true,
                    allowBind: false,
                },
            ],

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

    globalIgnores(['.next/**', 'node_modules/**', 'coverage/**', 'dist/**', 'out/**', 'next-env.d.ts', '.worktrees/**', '.claude/**', 'docs/**', 'public/mockServiceWorker.js']),
]);
