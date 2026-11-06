import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { userEvent, within } from 'storybook/test';

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
        const body = within(document.body);
        await userEvent.click(await body.findByRole('button', { name: copyFor(globals).PartnerBrandingPrompt.accept }));
    },
};

export const AnswerFailed: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.post('*/api/events/:eventId/partner-branding/decline', () => HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 })),
        );
    },
    play: async ({ globals }) => {
        const body = within(document.body);
        await userEvent.click(await body.findByRole('button', { name: copyFor(globals).PartnerBrandingPrompt.decline }));
    },
};
