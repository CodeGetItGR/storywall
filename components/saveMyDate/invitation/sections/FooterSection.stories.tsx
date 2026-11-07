import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_TEXT, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const section = storySection('footer');

const meta = {
    title: 'SaveMyDate/Text/FooterSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLink: Story = {
    args: { section: storySection('footer', { link: 'https://example.com' }) },
};

export const LongContent: Story = {
    args: { section: storySection('footer', { text: LONG_TEXT }) },
};

export const Empty: Story = {
    args: { section: storySection('footer', { text: '' }) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};
