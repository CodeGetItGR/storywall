import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { labelsFor, SectionStory, storySection } from '@/.storybook/invitation';

const section = storySection('photo');

const meta = {
    title: 'SaveMyDate/Media/PhotoSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByRole('img', { name: labelsFor(globals).eventPhotoAlt })).toBeVisible();
    },
};

export const CroppedToTop: Story = {
    args: { section: storySection('photo', { imageY: 0 }) },
};

export const CroppedToBottom: Story = {
    args: { section: storySection('photo', { imageY: 100 }) },
};

export const Short: Story = {
    args: { section: storySection('photo', {}, { style: { ...section.style, minHeight: 200 } }) },
};

export const Tall: Story = {
    args: { section: storySection('photo', {}, { style: { ...section.style, minHeight: 640 } }) },
};

export const WithText: Story = {
    args: {
        section: storySection(
            'photo',
            {},
            { elements: [{ id: 'photo-text', kind: 'text', role: 'title', text: 'Μαρία & Γιώργος', style: { size: 34 } }] },
        ),
    },
};

// Guests see nothing for a photo section with no photo, so there is nothing to capture.
export const NoPhoto: Story = {
    tags: ['visual-skip'],
    args: { section: storySection('photo', { photo: undefined }) },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('.photo-section-inner')).toBeNull();
    },
};
