import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { PublishSheet } from '@/components/saveMyDate/editor/publish/PublishSheet';
import type { PublishSheetState } from '@/hooks/usePublishInvitation';

const sheet = (state: Partial<PublishSheetState> = {}): PublishSheetState => ({
    open: true,
    close: fn(),
    value: '',
    setValue: fn(),
    check: 'empty',
    canSubmit: false,
    isPublishing: false,
    failed: false,
    submit: fn((event) => event.preventDefault()),
    ...state,
});

const meta = {
    title: 'SaveMyDate/Editor/Publish/PublishSheet',
    component: PublishSheet,
    args: { sheet: sheet(), inviteHost: 'invite.storywall.gr' },
    play: async () => {
        await waitForOpen('dialog');
    },
} satisfies Meta<typeof PublishSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

// Nothing typed yet, so Publish is off.
export const Empty: Story = {
    play: async ({ args, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const dialog = within(await waitForOpen('dialog'));
        await expect(dialog.getByRole('button', { name: copy.publish })).toBeDisabled();
        await userEvent.type(dialog.getByLabelText(copy.publishLink), 'M');
        await expect(args.sheet.setValue).toHaveBeenCalledWith('m');
    },
};

// The spinner turns, so the visual check skips it.
export const Checking: Story = {
    args: { sheet: sheet({ value: 'maria-nikos', check: 'checking' }) },
    tags: ['visual-skip'],
};

export const Available: Story = {
    args: { sheet: sheet({ value: 'maria-nikos', check: 'available', canSubmit: true }) },
    play: async ({ args, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const dialog = within(await waitForOpen('dialog'));
        await userEvent.click(dialog.getByRole('button', { name: copy.publish }));
        await expect(args.sheet.submit).toHaveBeenCalledOnce();
    },
};

export const Taken: Story = {
    args: { sheet: sheet({ value: 'taken-link', check: 'taken' }) },
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const dialog = within(await waitForOpen('dialog'));
        await expect(dialog.getByLabelText(copy.publishLink)).toHaveAttribute('aria-invalid', 'true');
        await expect(dialog.getByText(copy.slugTaken)).toBeVisible();
    },
};

export const NotAllowed: Story = {
    args: { sheet: sheet({ value: 'admin', check: 'reserved' }) },
};

export const Invalid: Story = {
    args: { sheet: sheet({ value: 'ab', check: 'invalid' }) },
};

// Publishing failed for another reason, so the host can try again.
export const Failed: Story = {
    args: { sheet: sheet({ value: 'maria-nikos', check: 'available', canSubmit: true, failed: true }) },
    play: async ({ globals }) => {
        const dialog = within(await waitForOpen('dialog'));
        await expect(dialog.getByRole('alert')).toHaveTextContent(copyFor(globals).InvitationEditor.publishFailed);
    },
};

// While it publishes, the sheet can't be closed.
export const Publishing: Story = {
    args: { sheet: sheet({ value: 'maria-nikos', check: 'available', isPublishing: true }) },
    play: async ({ globals }) => {
        const dialog = within(await waitForOpen('dialog'));
        await expect(dialog.getByRole('button', { name: copyFor(globals).InvitationEditor.cancel })).toBeDisabled();
    },
};
