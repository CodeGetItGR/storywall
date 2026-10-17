import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useCallback, useState } from 'react';
import { fn } from 'storybook/test';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

function SampleContent() {
    return (
        <Modal.Body className="px-5 pt-12 pb-5">
            <h2 className="text-base font-semibold text-ink">Edit event</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">Change the title, date or venue.</p>
        </Modal.Body>
    );
}

const meta = {
    title: 'UI/Modal',
    component: Modal,
    parameters: { layout: 'fullscreen' },
    args: {
        open: true,
        onClose: fn(),
        closeLabel: 'Close',
        ariaLabel: 'Edit event',
        dismissOnBack: false,
        children: <SampleContent />,
    },
    argTypes: {
        size: { control: 'select', options: ['sm', 'md', 'lg', 'full'] },
        variant: { control: 'select', options: ['center', 'sheet', 'drawer'] },
    },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Center: Story = {};

export const Small: Story = {
    args: { size: 'sm' },
};

export const Large: Story = {
    args: { size: 'lg' },
};

export const Sheet: Story = {
    args: { variant: 'sheet' },
};

export const Drawer: Story = {
    args: { variant: 'drawer' },
};

export const FullScreen: Story = {
    args: { size: 'full' },
};

export const WithoutCloseButton: Story = {
    args: { showCloseButton: false },
};

function ToggleModal() {
    const [open, setOpen] = useState(false);
    const openModal = useCallback(() => setOpen(true), []);
    const closeModal = useCallback(() => setOpen(false), []);

    return (
        <div className="p-4">
            <Button onClick={openModal}>Open modal</Button>
            <Modal open={open} onClose={closeModal} ariaLabel="Edit event">
                <SampleContent />
            </Modal>
        </div>
    );
}

export const Interactive: Story = {
    render: () => <ToggleModal />,
    // Closed at rest, so there is nothing new to snapshot.
    parameters: { chromatic: { disableSnapshot: true } },
};
