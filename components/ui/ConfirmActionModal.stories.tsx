import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Trash2 } from 'lucide-react';
import { fn } from 'storybook/test';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';

const meta = {
    title: 'UI/ConfirmActionModal',
    component: ConfirmActionModal,
    parameters: { layout: 'fullscreen' },
    args: {
        open: true,
        title: 'Delete this post?',
        body: 'The post and its comments will be removed for everyone.',
        confirmLabel: 'Delete post',
        cancelLabel: 'Keep post',
        onCloseAction: fn(),
        onConfirmAction: fn(),
    },
} satisfies Meta<typeof ConfirmActionModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Danger: Story = {};

export const WithIcon: Story = {
    args: { icon: <Trash2 className="h-5 w-5" /> },
};

export const DefaultTone: Story = {
    args: {
        tone: 'default',
        title: 'Publish the event?',
        body: 'Guests with the link can join once it is published.',
        confirmLabel: 'Publish',
        cancelLabel: 'Not yet',
    },
};

export const Confirming: Story = {
    args: { isConfirming: true },
};

export const ConfirmDisabled: Story = {
    args: { confirmDisabled: true },
};

export const WithoutCancel: Story = {
    args: { showCancelAction: false, showCloseButton: false },
};
