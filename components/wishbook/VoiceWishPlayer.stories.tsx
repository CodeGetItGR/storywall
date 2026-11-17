import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { STORY_VOICE_WISH_URL } from '@/.storybook/fixtures';
import { VoiceWishPlayer } from '@/components/wishbook/VoiceWishPlayer';

const meta = {
    title: 'Wishbook/VoiceWishPlayer',
    component: VoiceWishPlayer,
    args: { src: STORY_VOICE_WISH_URL, durationMs: 42_000 },
} satisfies Meta<typeof VoiceWishPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

// At rest: the play button and the recording's length. Nothing plays on its own.
export const Default: Story = {};

// The recording would not load: one short line under the button.
export const Failed: Story = {
    args: { src: '/missing-voice-wish.m4a' },
    async play({ canvasElement, globals }) {
        canvasElement.querySelector('audio')?.dispatchEvent(new Event('error'));
        await expect(await within(canvasElement).findByText(copyFor(globals).VoiceWish.cantPlay)).toBeVisible();
    },
};
