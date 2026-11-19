import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { expect, fn, waitFor, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyDraft } from '@/.storybook/editor';
import { storyDraftActivationItems, storyRsvpAddon, storySaveMyDateAddon } from '@/.storybook/featureAddons';
import { storyAppConfig } from '@/.storybook/fixtures';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { PublishAddonSheet } from '@/components/saveMyDate/editor/publish/PublishAddonSheet';
import type { AppConfigResponseDto, EventStatus } from '@/lib/api/types';

const draft = storyDraft();
// The invitation asks for replies, so RSVP is offered too.
const document = {
    ...draft.document,
    sections: draft.document.sections.map((section) => (section.type === 'rsvp' ? { ...section, visible: true } : section)),
};

// A small plan with posts only, selling the invitation and RSVP as add-ons.
const appConfig = {
    ...storyAppConfig,
    planTiers: [{ ...storyAppConfig.planTiers[0], id: 'plan-lite', code: 'LITE', name: 'Lite', moduleKeys: ['posts'] }],
    paidServices: [storySaveMyDateAddon, storyRsvpAddon],
    modules: ['posts', 'rsvp', 'save_my_date'].map((moduleKey, sortOrder) => ({
        id: moduleKey,
        moduleKey,
        name: moduleKey,
        description: null,
        isEnabled: true,
        sortOrder,
    })),
} as unknown as AppConfigResponseDto;

const draftQuote = storyDraftActivationItems();
const liveQuote = {
    ...draftQuote,
    kind: 'MODULE_UNLOCK',
    items: [
        {
            ...draftQuote.items[1],
            name: storySaveMyDateAddon.name,
            listMinor: storySaveMyDateAddon.priceAmountMinor,
            priceMinor: storySaveMyDateAddon.priceAmountMinor,
            paidServiceCode: storySaveMyDateAddon.code,
        },
    ],
    listTotalMinor: storySaveMyDateAddon.priceAmountMinor,
    totalMinor: storySaveMyDateAddon.priceAmountMinor,
};

function handlers(eventStatus: EventStatus) {
    return [
        http.get('*/api/events/:eventId/billing', () =>
            HttpResponse.json({ eventStatus, planTierCode: 'LITE', addons: [], orders: [], storage: null }),
        ),
        http.get('*/api/events/:eventId/modules', () => HttpResponse.json([{ id: 'posts', moduleKey: 'posts', isEnabled: true, isAvailable: true }])),
        // The full PriceBreakdown shape the server sends: a draft's activation, or the add-on alone on a live event.
        http.post('*/api/events/:eventId/quote', () => HttpResponse.json(eventStatus === 'DRAFT' ? draftQuote : liveQuote)),
    ];
}

// Waits as long as waitForOpen: a busy runner can take more than the default second.
const SLOW = { timeout: 10_000 };

const meta = {
    title: 'SaveMyDate/Editor/Publish/PublishAddonSheet',
    component: PublishAddonSheet,
    decorators: [withAppContext],
    parameters: { app: { appConfig } },
    args: { step: { open: true, eventId: 'evt-wedding', close: fn(), fallBack: fn() }, draftId: draft.id, document },
} satisfies Meta<typeof PublishAddonSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

// A live event: the add-ons are paid on their own.
export const LiveEvent: Story = {
    beforeEach({ msw }) {
        msw.use(...handlers('ACTIVE'));
    },
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const sheet = within(await waitForOpen('dialog'));
        await expect(await sheet.findByRole('heading', { name: copy.addOnTitle }, SLOW)).toBeVisible();
        await expect(sheet.getByRole('checkbox', { name: new RegExp(storyRsvpAddon.name) })).not.toBeChecked();
    },
};

// A draft event: the add-ons join its plan's payment.
export const DraftEvent: Story = {
    beforeEach({ msw }) {
        msw.use(...handlers('DRAFT'));
    },
    play: async ({ globals }) => {
        const copy = copyFor(globals);
        const sheet = within(await waitForOpen('dialog'));
        await expect(await sheet.findByRole('heading', { name: copy.InvitationEditor.addOnTitle }, SLOW)).toBeVisible();
        // The plan's own row, from the activation quote.
        await expect(await sheet.findByText(copy.PriceBreakdown.items.activation.replace('{plan}', 'Lite'), {}, SLOW)).toBeVisible();
    },
};

// The event's billing and features are still loading.
export const Loading: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/events/:eventId/billing', () => delay('infinite')), ...handlers('ACTIVE'));
    },
    play: async () => {
        const sheet = within(await waitForOpen('dialog'));
        await expect(await sheet.findByRole('status', {}, SLOW)).toBeVisible();
    },
};

// The invitation was switched on elsewhere meanwhile: publishing goes on, with no step.
export const CoveredNow: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/events/:eventId/modules', () =>
                HttpResponse.json([
                    { id: 'posts', moduleKey: 'posts', isEnabled: true, isAvailable: true },
                    { id: 'save_my_date', moduleKey: 'save_my_date', isEnabled: true, isAvailable: true },
                ]),
            ),
            ...handlers('ACTIVE'),
        );
    },
    play: async ({ args }) => {
        await waitFor(() => expect(args.step.fallBack).toHaveBeenCalledWith('publish'), SLOW);
    },
};

// The event's features can't be read: the plan dialog takes over.
export const ReadFailed: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/events/:eventId/modules', () => new HttpResponse(null, { status: 500 })), ...handlers('ACTIVE'));
    },
    play: async ({ args }) => {
        await waitFor(() => expect(args.step.fallBack).toHaveBeenCalledWith('plan'), SLOW);
    },
};
