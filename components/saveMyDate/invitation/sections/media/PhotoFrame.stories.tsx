import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { labelsFor, SectionStory, storySection } from '@/.storybook/invitation';
import type { PhotoFrameElement } from '@/lib/invitation/photoFrame';

const base = storySection('photoFrame');
const element = base.elements[0] as PhotoFrameElement;

const withFrame = (changes: Partial<PhotoFrameElement>) => storySection('photoFrame', {}, { elements: [{ ...element, animation: 'none', ...changes }] });

const meta = {
    title: 'SaveMyDate/Media/PhotoFrame',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section: withFrame({}) },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByRole('img', { name: labelsFor(globals).eventPhotoAlt })).toBeVisible();
    },
};

export const MovedToTheLeft: Story = {
    args: { section: withFrame({ imageX: 0 }) },
};

export const MovedToTheRight: Story = {
    args: { section: withFrame({ imageX: 100 }) },
};

export const ZoomedIn: Story = {
    args: { section: withFrame({ zoom: 2 }) },
};

export const SmallerFrame: Story = {
    args: { section: withFrame({ boxScale: 0.6 }) },
};

// Older saves may not have the photo's own size. It still fills the frame.
export const PhotoSizeNotSaved: Story = {
    args: { section: withFrame({ imageWidth: 0, imageHeight: 0 }) },
};

export const WithText: Story = {
    args: {
        section: storySection(
            'photoFrame',
            {},
            {
                elements: [
                    { ...element, animation: 'none' },
                    { id: 'frame-text', kind: 'text', role: 'title', text: 'Μαρία & Γιώργος', style: { size: 34 } },
                ],
            },
        ),
    },
};

// Guests see nothing for a frame with nothing in it, so there is nothing to capture.
export const NoFrameChosen: Story = {
    tags: ['visual-skip'],
    args: { section: withFrame({ frameId: '' }) },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('.photo-frame-inner')).toBeNull();
    },
};

export const NoPhoto: Story = {
    tags: ['visual-skip'],
    args: { section: withFrame({ photo: undefined }) },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('.photo-frame-inner')).toBeNull();
    },
};
