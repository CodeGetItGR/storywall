import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_TEXT, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const section = storySection('invitation');

const meta = {
    title: 'SaveMyDate/Text/InvitationTextSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongContent: Story = {
    args: { section: storySection('invitation', { text: LONG_TEXT }) },
};

export const Empty: Story = {
    args: { section: storySection('invitation', { text: '' }, { elements: [] }) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};
