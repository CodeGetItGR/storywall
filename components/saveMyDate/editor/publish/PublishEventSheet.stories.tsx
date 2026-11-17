import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { eventStepHandlers, storyDraft } from '@/.storybook/editor';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { PublishEventSheet } from '@/components/saveMyDate/editor/publish/PublishEventSheet';

const draft = storyDraft();

// Waits as long as waitForOpen: a busy runner can take more than the default second.
const SLOW = { timeout: 10_000 };

const meta = {
    title: 'SaveMyDate/Editor/Publish/PublishEventSheet',
    component: PublishEventSheet,
    decorators: [withAppContext],
    args: {
        step: { open: true, close: fn(), onAttached: fn() },
        draftId: draft.id,
        eventType: draft.eventType,
        document: draft.document,
    },
} satisfies Meta<typeof PublishEventSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

// The host has a wedding: they choose it or make a new event.
export const ChooseEvent: Story = {
    beforeEach({ msw }) {
        msw.use(...eventStepHandlers({ withEvent: true }));
    },
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const sheet = within(await waitForOpen('dialog'));
        await expect(await sheet.findByRole('button', { name: /Eleni & Nikos/ }, SLOW)).toBeVisible();
        await expect(sheet.getByRole('button', { name: copy.newEvent })).toBeVisible();
    },
};

// No event to choose: the new event's plan step.
export const NewEvent: Story = {
    beforeEach({ msw }) {
        msw.use(...eventStepHandlers());
    },
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const sheet = within(await waitForOpen('dialog'));
        await expect(await sheet.findByText(copy.choosePlan, {}, SLOW)).toBeVisible();
        await expect(sheet.getByRole('button', { name: copy.continueToPayment })).toBeDisabled();
    },
};
