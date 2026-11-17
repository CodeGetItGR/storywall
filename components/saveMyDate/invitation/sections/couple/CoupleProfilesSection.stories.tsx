import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor } from 'storybook/test';

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

// Where each match sits. The checks below only apply when the two partners share a row.
const boxes = (root: HTMLElement, selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector), (el) => el.getBoundingClientRect());
const sideBySide = (root: HTMLElement) => {
    const [a, b] = boxes(root, '.couple-profile-block');
    return a.left !== b.left;
};

// Role 16px, parents label 13px, parents' names 18px. Side by side, the two names line up.
export const OnePhoto: Story = {
    play: async ({ canvasElement }) => {
        // The photo loads after the first render and moves the name next to it.
        await waitFor(() => {
            const names = boxes(canvasElement, '.couple-profile-block h2');
            if (sideBySide(canvasElement)) expect(names[0].top).toBeCloseTo(names[1].top, 0);
        });
        await expect(fontSizes(canvasElement, '.couple-profile-role')).toEqual(['16px', '16px']);
        await expect(fontSizes(canvasElement, '.couple-profile-family-label')).toEqual(['13px', '13px']);
        await expect(fontSizes(canvasElement, '.couple-profile-family-names')).toEqual(['18px', '18px']);
    },
};

export const BothPhotos: Story = {
    args: { section: storySection('coupleProfiles', { partnerB: { ...partnerB, photo } }) },
};

// With both photos, the photos stay lined up at the top even when one side has more text.
export const BothPhotosUnevenText: Story = {
    args: { section: storySection('coupleProfiles', { partnerA: { ...partnerA, familyNames: LONG_TEXT }, partnerB: { ...partnerB, photo } }) },
    play: async ({ canvasElement }) => {
        const photos = boxes(canvasElement, '.couple-profile-block img');
        await expect(photos).toHaveLength(2);
        if (sideBySide(canvasElement)) await expect(photos[0].top).toBeCloseTo(photos[1].top, 0);
    },
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
