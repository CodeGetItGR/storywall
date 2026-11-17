import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_NAME, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const section = storySection('coupleNames');

const meta = {
    title: 'SaveMyDate/Text/CoupleNamesSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongContent: Story = {
    args: { section: storySection('coupleNames', { partnerAName: LONG_NAME, partnerBName: LONG_NAME }) },
};

export const OneName: Story = {
    args: { section: storySection('coupleNames', { partnerBName: '' }) },
};

export const Empty: Story = {
    args: { section: storySection('coupleNames', { partnerAName: '', partnerBName: '' }) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};
