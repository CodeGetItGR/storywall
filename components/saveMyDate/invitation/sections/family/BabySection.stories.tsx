import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_NAME, LONG_TEXT, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const section = storySection('baby');

const meta = {
    title: 'SaveMyDate/Family/BabySection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutPhoto: Story = {
    args: { section: storySection('baby', { babyPhoto: undefined }) },
};

export const LongContent: Story = {
    args: { section: storySection('baby', { babyName: LONG_NAME, babyMessage: LONG_TEXT }) },
};

export const Empty: Story = {
    args: { section: storySection('baby', { babyName: '', babyMessage: '', babyPhoto: undefined }) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};
