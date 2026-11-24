import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { waitForOpen } from '@/.storybook/waitForOpen';
import { FeedSectionBackgroundSheet } from '@/components/feed/edit/FeedSectionBackgroundSheet';

const meta = {
    title: 'Feed/Edit/FeedSectionBackgroundSheet',
    component: FeedSectionBackgroundSheet,
    parameters: { layout: 'fullscreen' },
    args: {
        kind: 'color',
        isDesktop: false,
        color: undefined,
        themeColors: ['#7A3B2E', '#F5E6D3'],
        hasPhoto: false,
        uploading: false,
        failed: false,
        onColor: fn(),
        onPickPhoto: fn(),
        onRemovePhoto: fn(),
        onClose: fn(),
    },
    play: async () => {
        await waitForOpen('dialog');
    },
} satisfies Meta<typeof FeedSectionBackgroundSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Color: Story = { tags: ['visual-mobile-only'] };
export const ColorPicked: Story = { args: { color: '#B5BFA6' }, tags: ['visual-mobile-only'] };
export const ColorTooDark: Story = { args: { color: '#7A3B2E' }, tags: ['visual-mobile-only'] };
export const ColorDesktop: Story = { args: { isDesktop: true, color: '#AC9FC7' } };
export const Photo: Story = { args: { kind: 'photo', hasPhoto: true }, tags: ['visual-mobile-only'] };
// The first photo didn't upload.
export const PhotoFailed: Story = { args: { kind: 'photo', failed: true }, tags: ['visual-mobile-only'] };
