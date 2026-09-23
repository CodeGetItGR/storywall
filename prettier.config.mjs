/** @type {import('prettier').Config} */
const config = {
    semi: true,
    singleQuote: true,
    tabWidth: 4,
    useTabs: false,
    trailingComma: 'all',
    printWidth: 150,
    bracketSpacing: true,
    arrowParens: 'always',
    endOfLine: 'auto',

    plugins: ['prettier-plugin-tailwindcss'],
    tailwindStylesheet: './app/globals.css',
    tailwindFunctions: ['cn', 'clsx', 'cva'],
};

export default config;
