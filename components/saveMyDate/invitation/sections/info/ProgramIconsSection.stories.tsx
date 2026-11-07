import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_TEXT, LONG_TITLE, onDark, SectionStory, storySection } from '@/.storybook/invitation';
import { PROGRAM_ICONS } from '@/lib/invitation/sections';

const section = storySection('programIcons', {}, { textStyles: {} });
const rows = section.data.items;

const meta = {
    title: 'SaveMyDate/Info/ProgramIconsSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OddRowCount: Story = {};

export const EvenRowCount: Story = {
    args: { section: storySection('programIcons', { items: [...rows, { ...rows[0], id: 'p4', time: '01:00' }] }, { textStyles: {} }) },
};

export const AllIcons: Story = {
    args: {
        section: storySection('programIcons', {
            items: PROGRAM_ICONS.map((key) => ({ id: key, time: '18:00', label: key, description: '', icon: { kind: 'preset' as const, key } })),
        }, { textStyles: {} }),
    },
};

export const WithoutIcons: Story = {
    args: { section: storySection('programIcons', { items: rows.map((row) => ({ ...row, icon: { kind: 'none' as const } })) }, { textStyles: {} }) },
};

export const CustomImageIcon: Story = {
    args: {
        section: storySection('programIcons', {
            items: [{ ...rows[0], icon: { kind: 'custom' as const, image: { source: 'media' as const, mediaId: 'm-icon' }, mode: 'image' as const, name: 'Δικό μου' } }],
        }, { textStyles: {} }),
    },
};

export const NoRows: Story = {
    args: { section: storySection('programIcons', { items: [] }, { textStyles: {} }) },
};

export const LongContent: Story = {
    args: {
        section: storySection('programIcons', {
            title: LONG_TITLE,
            subtitle: LONG_TEXT,
            items: rows.map((row) => ({ ...row, label: LONG_TITLE, description: LONG_TEXT })),
        }, { textStyles: {} }),
    },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};
