import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';

import { waitForOpen } from '@/.storybook/waitForOpen';
import { WishEditSheet } from '@/components/wishbook/WishEditSheet';
import type { WishEditor } from '@/hooks/useWishEditor';

const editor: WishEditor = {
    draft: 'Wishing you a lifetime of love, laughter and long summer evenings together.',
    changeDraft: fn(),
    canSave: true,
    isSaving: false,
    saveError: null,
    isSheetOpen: true,
    isConfirmingDelete: false,
    isDeleting: false,
    open: fn(),
    close: fn(),
    save: fn(),
    askDelete: fn(),
    cancelDelete: fn(),
    confirmDelete: fn(),
};

const meta = {
    title: 'Wishbook/WishEditSheet',
    component: WishEditSheet,
    parameters: { layout: 'fullscreen' },
    args: { editor, maxLength: 2000 },
    // The sheet portals to the body and slides in: wait for it before the capture.
    async play() {
        await expect(await waitForOpen('dialog')).toBeVisible();
    },
} satisfies Meta<typeof WishEditSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Editing: Story = {};
export const Saving: Story = { args: { editor: { ...editor, isSaving: true, canSave: false } } };
export const ConfirmDelete: Story = { args: { editor: { ...editor, isSheetOpen: false, isConfirmingDelete: true } } };
