import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fireEvent, fn, userEvent, waitFor, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { conflictHandlers, draftHandlers, failingSaveHandlers, storyDraft, withEditorScreen } from '@/.storybook/editor';
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
