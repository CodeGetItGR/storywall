import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_NAME, LONG_TEXT, onDark, SectionStory, STORY_DECORATION, storySection } from '@/.storybook/invitation';

const section = storySection('coupleProfilesSimple');
const { partnerA, partnerB } = section.data;
const familyNames = 'Νίκος & Ελένη';

const meta = {
    title: 'SaveMyDate/Couple/CoupleProfilesSimpleSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDecorationAndFamilies: Story = {
    args: {
        section: storySection('coupleProfilesSimple', {
            partnerA: { ...partnerA, familyNames },
            partnerB: { ...partnerB, familyNames },
            decoration: STORY_DECORATION,
        }),
    },
};

export const LongContent: Story = {
    args: {
        section: storySection('coupleProfilesSimple', {
            partnerA: { ...partnerA, name: LONG_NAME, familyNames: LONG_TEXT },
            partnerB: { ...partnerB, name: LONG_NAME, familyNames: LONG_TEXT },
        }),
    },
};

export const Empty: Story = {
    args: {
        section: storySection('coupleProfilesSimple', {
            partnerA: { name: '', role: '', familyLabel: '', familyNames: '' },
            partnerB: { name: '', role: '', familyLabel: '', familyNames: '' },
        }),
    },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};
