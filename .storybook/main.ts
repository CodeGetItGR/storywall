import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
    stories: ['../components/**/*.stories.@(ts|tsx)', '../app/**/*.stories.@(ts|tsx)'],
    addons: ['@chromatic-com/storybook', '@storybook/addon-a11y', 'msw-storybook-addon'],
    framework: {
        name: '@storybook/nextjs-vite',
        options: {},
    },
    // public/ holds the logo, icons and MSW's mockServiceWorker.js.
    staticDirs: ['../public'],
};

export default config;
