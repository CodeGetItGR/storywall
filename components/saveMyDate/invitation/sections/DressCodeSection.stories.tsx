import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_TEXT, LONG_TITLE, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const section = storySection('dressCode');
const swatches = ['#b8dfd3', '#efe7ec', '#2f2b2d', '#8a6d3b', '#7a5c61', '#dddddd', '#ffffff', '#c9a227', '#3d5a80', '#98c1d9', '#ee6c4d'];

const meta = {
    title: 'SaveMyDate/Text/DressCodeSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OddColorCount: Story = {
    args: { section: storySection('dressCode', { colors: swatches.slice(0, 3) }) },
};

export const ManyColors: Story = {
    args: { section: storySection('dressCode', { colors: swatches }) },
};

export const NoColors: Story = {
    args: { section: storySection('dressCode', { colors: [] }) },
};

export const LongContent: Story = {
    args: { section: storySection('dressCode', { title: LONG_TITLE, note: LONG_TEXT }) },
};

export const Empty: Story = {
    args: { section: storySection('dressCode', { title: '', note: '', colors: [] }) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};
