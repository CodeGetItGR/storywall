import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_NAME, LONG_TEXT, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const photo = { source: 'media' as const, mediaId: 'm-a' };
const section = storySection('coupleProfiles');
const { partnerA, partnerB } = section.data;

const meta = {
    title: 'SaveMyDate/Couple/CoupleProfilesSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnePhoto: Story = {};

export const BothPhotos: Story = {
    args: { section: storySection('coupleProfiles', { partnerB: { ...partnerB, photo } }) },
};

export const WithoutPhotos: Story = {
    args: { section: storySection('coupleProfiles', { partnerA: { ...partnerA, photo: undefined } }) },
};

export const LongContent: Story = {
    args: {
        section: storySection('coupleProfiles', {
            partnerA: { ...partnerA, name: LONG_NAME, familyNames: LONG_TEXT },
            partnerB: { ...partnerB, name: LONG_NAME, familyNames: LONG_TEXT, photo },
        }),
    },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(section) },
};
