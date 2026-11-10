import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fireEvent, fn, userEvent, waitFor, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import {
    conflictHandlers,
    draftHandlers,
    failingSaveHandlers,
    publishHandlers,
    storyDraft,
    storyDraftOnEvent,
    withEditorScreen,
    withFirstEditorVisit,
} from '@/.storybook/editor';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { InvitationEditor } from '@/components/saveMyDate/editor/InvitationEditor';

const meta = {
    title: 'SaveMyDate/Editor/InvitationEditor',
    component: InvitationEditor,
    decorators: [withEditorScreen],
    parameters: { layout: 'fullscreen' },
    args: { draft: storyDraft(), onReload: fn() },
    beforeEach({ msw }) {
        msw.use(...draftHandlers());
    },
} satisfies Meta<typeof InvitationEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

// The colour input of the docked settings panel on a wide screen, or of the open sheet on a phone.
function textColorInput(label: string) {
    const inputs = within(document.body).getAllByLabelText(label);
    return inputs.find((input) => input.checkVisibility()) ?? inputs[0];
}

// A section's tools show once it is tapped, as on a phone.
async function tapSection(canvasElement: HTMLElement, name: string) {
    const section = within(canvasElement).getByRole('group', { name });
    fireEvent.pointerDown(section);
    await waitFor(() => expect(section).toHaveAttribute('data-active', 'true'));
    return section;
}

export const Default: Story = {};

// A phone opens the settings as a sheet.
export const SettingsSheet: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    play: async ({ canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.settings }));
        await waitForOpen('dialog');
    },
};

// A changed colour can be undone; the save status says it isn't saved yet.
export const Edited: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const canvas = within(canvasElement);
        fireEvent.input(textColorInput(copy.textColor), { target: { value: '#7a1f3d' } });
        await waitFor(() => expect(canvas.getByRole('button', { name: copy.undo })).toBeEnabled());
        await expect(canvas.getByText(copy.unsaved)).toBeInTheDocument();
    },
};

export const Preview: Story = {
    play: async ({ canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.preview }));
        await waitForOpen('dialog');
    },
};

// Publishing saves, then says it isn't available yet.
export const Publish: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: copy.publish }));
        await expect(await canvas.findByText(copy.publishUnavailable)).toBeVisible();
    },
};

// The first publish asks for the link, then says it is published.
export const FirstPublish: Story = {
    args: { draft: storyDraftOnEvent() },
    beforeEach({ msw }) {
        msw.use(...publishHandlers());
    },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        await userEvent.click(within(canvasElement).getByRole('button', { name: copy.publish }));
        const sheet = within(await waitForOpen('dialog'));
        await userEvent.type(sheet.getByLabelText(copy.publishLink), 'maria-nikos');
        await expect(await sheet.findByText(copy.slugAvailable, {}, { timeout: 10_000 })).toBeVisible();
        await userEvent.click(sheet.getByRole('button', { name: copy.publish }));
        await expect(await within(canvasElement).findByText(copy.published, {}, { timeout: 10_000 })).toBeVisible();
    },
};

// Published before: Publish publishes the changes straight away.
export const Republish: Story = {
    args: { draft: storyDraftOnEvent() },
    beforeEach({ msw }) {
        msw.use(...publishHandlers({ publishedAt: 'maria-nikos' }));
    },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        await userEvent.click(within(canvasElement).getByRole('button', { name: copy.publish }));
        await expect(await within(canvasElement).findByText(copy.republished, {}, { timeout: 10_000 })).toBeVisible();
    },
};

// The event's plan has no Save my date, so the editor offers the plan.
export const PlanMissing: Story = {
    args: { draft: storyDraftOnEvent() },
    beforeEach({ msw }) {
        msw.use(...publishHandlers({ publishedAt: 'maria-nikos', refusal: 5012 }));
    },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        await userEvent.click(within(canvasElement).getByRole('button', { name: copy.publish }));
        const dialog = within(await waitForOpen('dialog'));
        await waitFor(() => expect(dialog.getByText(copy.planMissingTitle)).toBeVisible());
    },
};

// The first visit opens the tour by itself.
export const Tour: Story = {
    tags: ['visual-desktop-only'],
    decorators: [withFirstEditorVisit],
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        await expect(within(await waitForOpen('dialog')).getByText(copy.tour.welcomeTitle)).toBeVisible();
    },
};

// On a phone the tour lights the part a step talks about, with the card along the bottom.
export const TourOnPhone: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    decorators: [withFirstEditorVisit],
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const card = within(await waitForOpen('dialog'));
        await userEvent.click(card.getByRole('button', { name: copy.tour.next }));
        await expect(await within(document.body).findByRole('dialog', { name: copy.tour.textTitle })).toBeVisible();
    },
};

// The draft was saved on another device, so the editor stops and offers the newer copy.
export const Conflict: Story = {
    beforeEach({ msw }) {
        msw.use(...conflictHandlers());
    },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        fireEvent.input(textColorInput(copy.textColor), { target: { value: '#7a1f3d' } });
        await userEvent.click(within(canvasElement).getByRole('button', { name: copy.publish }));
        await waitForOpen('dialog');
    },
};

// Saving keeps failing, so back asks before leaving.
export const SaveFailed: Story = {
    beforeEach({ msw }) {
        msw.use(...failingSaveHandlers());
    },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const canvas = within(canvasElement);
        fireEvent.input(textColorInput(copy.textColor), { target: { value: '#7a1f3d' } });
        await userEvent.click(canvas.getByRole('button', { name: copy.back }));
        await waitForOpen('dialog');
        await expect(canvas.getByText(copy.notSaved)).toBeInTheDocument();
    },
};

// The "+" under a section lists the sections this event may still add.
export const AddSection: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        // The first "+" sits above the top section, the second under it.
        const [, underTop] = within(canvasElement).getAllByRole('button', { name: copy.sections.add });
        await userEvent.click(underTop);
        const sheet = await waitForOpen('dialog');
        await userEvent.click(within(sheet).getByRole('button', { name: copy.sectionNames.photo }));
        await waitFor(() => expect(within(canvasElement).getAllByRole('group', { name: copy.sectionNames.photo })).toHaveLength(2));
        await expect(within(canvasElement).getByRole('button', { name: copy.undo })).toBeEnabled();
    },
};

// A hidden section stays on the canvas, faded, so it can be shown again.
export const HiddenSection: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const section = await tapSection(canvasElement, copy.sectionNames.dressCode);
        await userEvent.click(within(section).getByRole('button', { name: copy.sections.hide }));
        await expect(within(section).getByText(copy.sections.hidden)).toBeVisible();
    },
};

// Deleting asks first.
export const DeleteSection: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const section = await tapSection(canvasElement, copy.sectionNames.dressCode);
        await userEvent.click(within(section).getByRole('button', { name: copy.sections.options }));
        await userEvent.click(within(await waitForOpen('menu')).getByRole('menuitem', { name: copy.sections.delete }));
        await waitForOpen('dialog');
    },
};
