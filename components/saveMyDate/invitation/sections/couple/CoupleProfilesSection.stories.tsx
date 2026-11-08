import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';

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

const fontSizes = (root: HTMLElement, selector: string) =>
    Array.from(root.querySelectorAll<HTMLElement>(selector), (el) => getComputedStyle(el).fontSize);

// Role 16px, parents label 13px, parents' names 18px.
export const OnePhoto: Story = {
    play: async ({ canvasElement }) => {
        await expect(fontSizes(canvasElement, '.couple-profile-role')).toEqual(['16px', '16px']);
        await expect(fontSizes(canvasElement, '.couple-profile-family-label')).toEqual(['13px', '13px']);
        await expect(fontSizes(canvasElement, '.couple-profile-family-names')).toEqual(['18px', '18px']);
    },
};

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
