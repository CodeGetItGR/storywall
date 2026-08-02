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

    plugins: ['prettier-plugin-tailwindcss'],
    tailwindFunctions: ['cn', 'clsx', 'cva'],
};

export default config;
