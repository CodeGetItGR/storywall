import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_NAME, LONG_TITLE, onDark, SectionStory, storyPeople, storySection } from '@/.storybook/invitation';

const section = storySection('parentsSimple');

const meta = {
    title: 'SaveMyDate/Family/ParentsSimpleSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutDecoration: Story = {
    args: { section: storySection('parentsSimple', { decoration: undefined }) },
};

export const OddGodparentCount: Story = {
    args: { section: storySection('parentsSimple', { godparents: storyPeople(3, false) }) },
};

export const EvenGodparentCount: Story = {
    args: { section: storySection('parentsSimple', { godparents: storyPeople(4, false) }) },
};

export const NoGodparents: Story = {
    args: { section: storySection('parentsSimple', { godparentsTitle: '', godparents: [] }) },
};

export const LongContent: Story = {
    args: {
        section: storySection('parentsSimple', {
            parentsTitle: LONG_TITLE,
            parentAName: LONG_NAME,
            parentBName: LONG_NAME,
            godparents: [{ id: 'long', name: LONG_NAME }],
        }),
    },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};
