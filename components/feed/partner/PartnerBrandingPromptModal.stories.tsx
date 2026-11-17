import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import type { Globals } from 'storybook/internal/types';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { PartnerBrandingPromptModal } from '@/components/feed/partner/PartnerBrandingPromptModal';

const meta = {
    title: 'Feed/Partner/PartnerBrandingPromptModal',
    component: PartnerBrandingPromptModal,
    args: { eventId: 'evt-story', prompt: { displayName: 'Aegean Weddings', noticeVersion: 'v1' } },
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PartnerBrandingPromptModal>;

export default meta;
type Story = StoryObj<typeof meta>;

// The modal focuses its close button on a later frame, and the click moves focus to a button that then turns disabled.
// Where a focus ring ends up depends on the timing of both, so this waits for the first and leaves nothing focused.
async function answer(name: string, globals: Globals) {
    const body = within(document.body);
    const close = await body.findByRole('button', { name: copyFor(globals).PartnerBrandingPrompt.close });
    await waitFor(() => expect(close).toHaveFocus(), { timeout: 10_000 });
    await userEvent.click(await body.findByRole('button', { name }));
    (document.activeElement as HTMLElement | null)?.blur();
}

export const Open: Story = {};

export const Accepting: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.post('*/api/events/:eventId/partner-branding/acceptance', async () => {
                await delay('infinite');
                return new HttpResponse(null, { status: 204 });
            }),
        );
    },
    play: async ({ globals }) => {
        await answer(copyFor(globals).PartnerBrandingPrompt.accept, globals);
    },
};

export const AnswerFailed: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.post('*/api/events/:eventId/partner-branding/decline', () =>
                HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 }),
            ),
        );
    },
    play: async ({ globals }) => {
        const copy = copyFor(globals);
        await answer(copy.PartnerBrandingPrompt.decline, globals);
        await within(document.body).findByText(copy.ApiErrors.generic);
    },
};
