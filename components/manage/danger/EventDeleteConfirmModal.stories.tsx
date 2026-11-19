import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { EventDeleteConfirmModal } from '@/components/manage/danger/EventDeleteConfirmModal';

const meta = {
    title: 'Manage/Danger/EventDeleteConfirmModal',
    component: EventDeleteConfirmModal,
    decorators: [withAppContext],
    parameters: { layout: 'fullscreen' },
    args: {
        variant: 'sheet',
        open: true,
        step: 'verify',
        otpCode: '',
        codeDigits: 6,
        onOtpChangeAction: fn(),
        otpInvalid: false,
        deleteError: null,
        resendSeconds: 42,
        isSendingCode: false,
        isDeleting: false,
        onCloseAction: fn(),
        onSendCodeAction: fn(),
        onConfirmAction: fn(),
    },
} satisfies Meta<typeof EventDeleteConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

// A live event's code step, a bottom sheet on phones.
export const CodeStep: Story = {};

// The code expired: today's error, with a new code ready to send.
export const CodeExpired: Story = {
    args: { resendSeconds: 0, deleteError: 'That code has expired. Request a new one.' },
};

// A draft keeps its warning step in a centered dialog.
export const DraftWarning: Story = {
    args: { variant: 'center', draft: true, step: 'send', resendSeconds: 0 },
};
