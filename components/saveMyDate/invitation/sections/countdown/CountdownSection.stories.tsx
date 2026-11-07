import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { hiddenDate, LONG_TITLE, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const section = storySection('countdown');

const meta = {
    title: 'SaveMyDate/Date/CountdownSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutDate: Story = {
    args: { before: [] },
};

export const DatePassed: Story = {
    args: { before: [hiddenDate('el', { iso: '2026-01-10T18:00' })] },
};

export const LongContent: Story = {
    args: { section: storySection('countdown', { label: LONG_TITLE }) },
};

export const EmptyLabel: Story = {
    args: { section: storySection('countdown', { label: '' }) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};
