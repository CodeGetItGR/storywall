import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { expect, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { draftHandlers, withEditorScreen } from '@/.storybook/editor';

import InvitationEditorPage from './PageClient';

// The editor page loading its draft. The server page only adds the release check,
// the prefetch and the uploaded fonts.
const meta = {
    title: 'SaveMyDate/Pages/Editor',
    component: InvitationEditorPage,
    decorators: [withEditorScreen],
    parameters: { layout: 'fullscreen', nextjs: { navigation: { pathname: '/save-my-date/editor/draft-1' } } },
    args: { draftId: 'draft-1' },
} satisfies Meta<typeof InvitationEditorPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {
    beforeEach({ msw }) {
        msw.use(...draftHandlers());
    },
    play: async ({ canvasElement, globals }) => {
        await within(canvasElement).findByRole('button', { name: copyFor(globals).InvitationEditor.publish }, { timeout: 10_000 });
    },
};

// The draft never arrives. The spinner turns, so the visual check skips it.
export const Loading: Story = {
    tags: ['visual-skip'],
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/invitation-drafts/:id', async () => {
                await delay('infinite');
                return HttpResponse.json({});
            }),
        );
    },
};

export const NotFound: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/invitation-drafts/:id', () => HttpResponse.json({ status: 404, errorCode: 'NOT_FOUND' }, { status: 404 })));
    },
    play: async ({ canvasElement, globals }) => {
        await expect(await within(canvasElement).findByText(copyFor(globals).InvitationEditor.loadFailed, {}, { timeout: 10_000 })).toBeVisible();
    },
};
