import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { STORY_VOICE_WISH_URL } from '@/.storybook/fixtures';
import { VoiceRecorder } from '@/components/wishbook/VoiceRecorder';
import type { VoiceRecorder as VoiceRecorderState } from '@/hooks/useVoiceRecorder';

// Every state is a fixed prop: no microphone, no timers.
const recorder: VoiceRecorderState = {
    status: 'idle',
    elapsedMs: 0,
    recording: null,
    start: fn(),
    stop: fn(),
    discard: fn(),
};

const meta = {
    title: 'Wishbook/VoiceRecorder',
    component: VoiceRecorder,
    args: { recorder },
} satisfies Meta<typeof VoiceRecorder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Recording: Story = { args: { recorder: { ...recorder, status: 'recording', elapsedMs: 12_000 } } };

export const Recorded: Story = {
    args: {
        recorder: {
            ...recorder,
            status: 'recorded',
            elapsedMs: 42_000,
            recording: { blob: new Blob([], { type: 'audio/wav' }), url: STORY_VOICE_WISH_URL, durationMs: 42_000 },
        },
    },
};

export const Denied: Story = { args: { recorder: { ...recorder, status: 'denied' } } };

// The edit sheet: the wish's stored recording, ready to be replaced or removed.
export const Existing: Story = {
    args: { existing: { url: STORY_VOICE_WISH_URL, durationMs: 9_000 }, onRemoveExisting: fn() },
};

export const Disabled: Story = { args: { disabled: true } };
