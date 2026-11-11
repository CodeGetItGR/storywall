import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { PublishSignInDialog } from '@/components/saveMyDate/editor/publish/PublishSignInDialog';

const meta = {
    title: 'SaveMyDate/Editor/Publish/PublishSignInDialog',
    component: PublishSignInDialog,
    args: {
        signIn: {
            open: true,
            close: fn(),
            loginHref: '/login?next=%2Fsave-my-date%2Feditor%2Fdraft-1%3Fpublish%3D1',
            registerHref: '/register?next=%2Fsave-my-date%2Feditor%2Fdraft-1%3Fpublish%3D1',
        },
    },
} satisfies Meta<typeof PublishSignInDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// A visitor taps Publish: signing in or creating an account brings them back to publish.
export const Open: Story = {
    play: async ({ args, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const dialog = within(await waitForOpen('dialog'));
        await expect(dialog.getByText(copy.signInTitle)).toBeVisible();
        await expect(dialog.getByText(copy.signInBody)).toBeVisible();
        await expect(dialog.getByRole('link', { name: copy.signIn })).toHaveAttribute('href', args.signIn.loginHref);
        await expect(dialog.getByRole('link', { name: copy.createAccount })).toHaveAttribute('href', args.signIn.registerHref);
    },
};
