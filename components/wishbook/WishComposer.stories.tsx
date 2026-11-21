import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { STORY_VOICE_WISH_URL } from '@/.storybook/fixtures';
import { WishComposer } from '@/components/wishbook/WishComposer';
import type { WishComposerState } from '@/hooks/useWishComposer';

// Every state is a fixed prop: no microphone, no timers.
const composer: WishComposerState = {
    message: '',
    changeMessage: fn(),
    recorder: { status: 'idle', elapsedMs: 0, recording: null, start: fn(), stop: fn(), discard: fn() },
    canSend: false,
    isSending: false,
    sendError: null,
    showSent: false,
    submit: fn(),
};

const meta = {
    title: 'Wishbook/WishComposer',
    component: WishComposer,
    args: { composer, maxMessageLength: 2000 },
    decorators: [
        (Story) => (
            <div className="max-w-md p-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof WishComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithRecording: Story = {
    args: {
        composer: {
            ...composer,
            message: 'Να ζήσετε!',
            canSend: true,
            recorder: {
                ...composer.recorder,
                status: 'recorded',
                elapsedMs: 42_000,
                recording: { blob: new Blob([], { type: 'audio/wav' }), url: STORY_VOICE_WISH_URL, durationMs: 42_000 },
            },
        },
    },
};

export const Recording: Story = {
    args: { composer: { ...composer, recorder: { ...composer.recorder, status: 'recording', elapsedMs: 12_000 } } },
};

export const Sent: Story = { args: { composer: { ...composer, showSent: true } } };
