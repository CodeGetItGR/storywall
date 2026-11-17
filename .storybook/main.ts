import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
    stories: ['../components/**/*.stories.@(ts|tsx)', '../app/**/*.stories.@(ts|tsx)'],
    addons: ['@storybook/addon-a11y', 'msw-storybook-addon'],
    framework: {
        name: '@storybook/nextjs-vite',
        options: {},
    },
    // public/ holds the logo, icons and MSW's mockServiceWorker.js. assets/
    // holds images only stories use, so they stay out of the app.
    staticDirs: ['../public', { from: './assets', to: '/storybook-assets' }],
};

export default config;
