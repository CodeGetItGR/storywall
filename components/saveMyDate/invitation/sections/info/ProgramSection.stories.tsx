import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_TEXT, LONG_TITLE, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const rows = [
    { id: 'p1', time: '18:00', label: 'Μυστήριο' },
    { id: 'p2', time: '20:00', label: 'Δεξίωση' },
    { id: 'p3', time: '21:30', label: 'Δείπνο' },
    { id: 'p4', time: '23:00', label: 'Πάρτι' },
];
const section = storySection('program');

const meta = {
    title: 'SaveMyDate/Info/ProgramSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneRow: Story = {};

export const OddRowCount: Story = {
    args: { section: storySection('program', { items: rows.slice(0, 3) }) },
};

export const EvenRowCount: Story = {
    args: { section: storySection('program', { items: rows }) },
};

export const NoRows: Story = {
    args: { section: storySection('program', { items: [] }) },
};

export const LongContent: Story = {
    args: { section: storySection('program', { title: LONG_TITLE, items: rows.map((row) => ({ ...row, label: LONG_TEXT })) }) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(storySection('program', { items: rows })) },
};
