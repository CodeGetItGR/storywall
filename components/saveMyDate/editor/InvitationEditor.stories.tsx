import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fireEvent, fn, userEvent, waitFor, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { conflictHandlers, draftHandlers, failingSaveHandlers, storyDraft, withEditorScreen } from '@/.storybook/editor';
import { storyUser } from '@/.storybook/fixtures';
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

// A section's height bar drags it taller, in one undo step.
export const SectionHeight: Story = {
    tags: ['visual-desktop-only'],
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const section = await tapSection(canvasElement, copy.sectionNames.dressCode);
        const bar = within(section).getByRole('slider', { name: copy.handles.sectionHeight });
        const rect = bar.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        fireEvent.pointerDown(bar, { pointerId: 1, clientX: x, clientY: y });
        fireEvent.pointerMove(bar, { pointerId: 1, clientX: x, clientY: y + 80 });
        fireEvent.pointerUp(bar, { pointerId: 1, clientX: x, clientY: y + 80 });
        await waitFor(() => expect(within(canvasElement).getByRole('button', { name: copy.undo })).toBeEnabled());
    },
};

// An admin also gets the footer's height, image and decoration sizes and the custom section arrows.
export const Admin: Story = {
    decorators: [withAppContext],
    parameters: { app: { user: { ...storyUser, role: 'ADMIN' } } },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor.handles;
        await expect(within(canvasElement).getByText(copy.twoColumns)).toBeInTheDocument();
    },
};
