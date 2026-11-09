import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { expect, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorScreen } from '@/.storybook/editor';

import StartInvitationDraftPage from './PageClient';

// /save-my-date/editor?theme=<slug>: starts a draft from the theme, then moves to its editor.
const meta = {
    title: 'SaveMyDate/Pages/EditorStart',
    component: StartInvitationDraftPage,
    decorators: [withEditorScreen],
    parameters: { layout: 'fullscreen', nextjs: { navigation: { pathname: '/save-my-date/editor', query: { theme: 'olive' } } } },
    args: { themeSlug: 'olive' },
} satisfies Meta<typeof StartInvitationDraftPage>;

export default meta;
type Story = StoryObj<typeof meta>;

// The new draft is on its way. The spinner turns, so the visual check skips it.
export const Starting: Story = {
    tags: ['visual-skip'],
    beforeEach({ msw }) {
        msw.use(
            http.post('*/api/invitation-drafts', async () => {
                await delay('infinite');
                return HttpResponse.json({});
            }),
        );
    },
};

export const Failed: Story = {
    beforeEach({ msw }) {
        msw.use(http.post('*/api/invitation-drafts', () => HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 })));
    },
    play: async ({ canvasElement, globals }) => {
        await expect(await within(canvasElement).findByText(copyFor(globals).InvitationEditor.loadFailed, {}, { timeout: 10_000 })).toBeVisible();
    },
};
