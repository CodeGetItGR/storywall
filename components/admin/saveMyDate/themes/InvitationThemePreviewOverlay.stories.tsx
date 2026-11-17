import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { expect, fn, waitFor, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/adminShell';
import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { InvitationThemePreviewOverlay } from '@/components/admin/saveMyDate/themes/InvitationThemePreviewOverlay';
import { storyTheme } from '@/components/admin/saveMyDate/themes/invitationThemeStoryData';

const meta = {
    title: 'Admin/SaveMyDate/Themes/InvitationThemePreviewOverlay',
    component: InvitationThemePreviewOverlay,
    decorators: [withAdminShell],
    args: { themeId: 'theme-1', onCloseAction: fn() },
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/admin/invitation-themes/:id', () => HttpResponse.json(storyTheme({ status: 'HIDDEN' }))),
            http.get('*/api/invitation-fonts/files', () => HttpResponse.json([])),
        );
    },
} satisfies Meta<typeof InvitationThemePreviewOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

// A hidden theme, drawn from the admin API.
export const Ready: Story = {
    play: async () => {
        const dialog = await waitForOpen('dialog');
        await waitFor(() => expect(dialog.querySelector('.smd-invitation')).not.toBeNull());
    },
};

export const Failed: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/admin/invitation-themes/:id', () => HttpResponse.json(storyTheme({ design: { nope: true } }))));
    },
    play: async ({ globals }) => {
        const dialog = await waitForOpen('dialog');
        await within(dialog).findByText(copyFor(globals).AdminPage.invitationThemes.previewOverlay.failed);
    },
};
