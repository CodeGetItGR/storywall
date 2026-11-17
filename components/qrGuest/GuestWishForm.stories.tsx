import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { STORY_VOICE_WISH_URL } from '@/.storybook/fixtures';
import { GuestWishForm } from '@/components/qrGuest/GuestWishForm';
import { GuestWishFormContent } from '@/components/qrGuest/GuestWishFormContent';
import type { GuestWishFormState } from '@/hooks/useGuestWishForm';

const meta = {
    title: 'QrGuest/GuestWishForm',
    component: GuestWishForm,
    args: { token: 'story-token', onSentChange: fn() },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-xl bg-background px-5 py-6">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof GuestWishForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// A guest opens the wish form from a scanned code.
export const Empty: Story = {};

// A recorded wish, ready to send without text. A fixed form state: no microphone, no timers.
const recordedForm: GuestWishFormState = {
    guestName: 'Maria',
    message: '',
    acceptedDocuments: true,
    sent: false,
    submitError: null,
    fieldErrors: {},
    canSubmit: true,
    isPending: false,
    maxMessageLength: 2000,
    recorder: {
        status: 'recorded',
        elapsedMs: 42_000,
        recording: { blob: new Blob([], { type: 'audio/wav' }), url: STORY_VOICE_WISH_URL, durationMs: 42_000 },
        start: fn(),
        stop: fn(),
        discard: fn(),
    },
    messageRequired: false,
    changeGuestName: fn(),
    changeMessage: fn(),
    changeAccepted: fn(),
    submit: fn(),
    writeAnother: fn(),
};

export const WithRecording: Story = {
    render: () => <GuestWishFormContent form={recordedForm} />,
};
