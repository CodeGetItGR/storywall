import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_NAME, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const section = storySection('parents');

const meta = {
    title: 'SaveMyDate/Family/ParentsSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongContent: Story = {
    args: { section: storySection('parents', { parents: `${LONG_NAME} & ${LONG_NAME}`, godparents: LONG_NAME }) },
};

export const Empty: Story = {
    args: { section: storySection('parents', { parents: '', godparents: '' }) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};
