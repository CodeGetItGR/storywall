import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { draftHandlers, storyDraft, withEditorScreen } from '@/.storybook/editor';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { InvitationEditor } from '@/components/saveMyDate/editor/InvitationEditor';

// Editing the invitation's texts in place, with the text toolbar.
const meta = {
    title: 'SaveMyDate/Editor/InvitationEditor/Texts',
    component: InvitationEditor,
    decorators: [withEditorScreen, withAppContext],
    parameters: { layout: 'fullscreen' },
    args: { draft: storyDraft(), onReload: fn() },
    beforeEach({ msw }) {
        msw.use(...draftHandlers());
    },
} satisfies Meta<typeof InvitationEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

// The couple's names at the top: a text the host added. The date further down is a section's own text.
const NAMES = 'element:top-title';
const SECTION_TEXT = '[data-smd-text^="field:"]';

function canvasText(canvasElement: HTMLElement, selector: string) {
    const text = canvasElement.querySelector<HTMLElement>(selector);
    if (!text) throw new Error(`No text ${selector}`);
    return text;
}

async function openText(canvasElement: HTMLElement, selector = `[data-smd-text="${NAMES}"]`) {
    // The names sit on a photo: wait until the text colour has settled on it, so the toolbar reads the final colour.
    await waitFor(() => expect(canvasElement.querySelector('[data-photo-tone="pending"]')).toBeNull(), { timeout: 15_000 });
    const text = canvasText(canvasElement, selector);
    text.scrollIntoView({ block: 'center' });
    await userEvent.click(text);
    return within(canvasElement).findByRole('toolbar');
}

// The tapped text takes the caret, with the toolbar above it on a computer.
export const EditingText: Story = {
    tags: ['visual-desktop-only'],
    play: async ({ canvasElement, globals }) => {
        const toolbar = await openText(canvasElement);
        await expect(toolbar).toHaveAccessibleName(copyFor(globals).InvitationEditor.textTools);
        await expect(canvasElement.querySelector('.smd-text-active')).toHaveFocus();
    },
};

// On a phone the toolbar sits at the bottom, above the keyboard.
export const EditingTextOnPhone: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    play: async ({ canvasElement }) => {
        const toolbar = await openText(canvasElement);
        await expect(toolbar).toHaveAttribute('data-docked', 'true');
    },
};

// Typing goes into the invitation and can be undone.
export const Typed: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        await openText(canvasElement);
        await userEvent.keyboard('{End} 2027');
        await waitFor(() => expect(within(canvasElement).getByRole('button', { name: copy.undo })).toBeEnabled());
        await expect(canvasElement.querySelector('.smd-text-active')).toHaveTextContent('2027');
    },
};

// Size, bold and alignment from the toolbar.
export const Styled: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const toolbar = within(await openText(canvasElement));
        await userEvent.selectOptions(toolbar.getByLabelText(copy.fontSize), '56');
        await userEvent.click(toolbar.getByRole('button', { name: copy.bold }));
        await userEvent.click(toolbar.getByRole('button', { name: copy.alignLeft }));
        await expect(toolbar.getByRole('button', { name: copy.bold })).toHaveAttribute('aria-pressed', 'true');
    },
};

export const ColorPicker: Story = {
    play: async ({ canvasElement, globals }) => {
        const toolbar = within(await openText(canvasElement));
        await userEvent.click(toolbar.getByRole('button', { name: copyFor(globals).InvitationEditor.textColor }));
        await waitForOpen('dialog');
    },
};

export const FontPicker: Story = {
    play: async ({ canvasElement, globals }) => {
        const toolbar = within(await openText(canvasElement));
        await userEvent.click(toolbar.getByRole('button', { name: copyFor(globals).InvitationEditor.font }));
        await waitForOpen('dialog');
    },
};

// A new paragraph goes under the text being edited, its wording selected to type over.
export const AddedText: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const toolbar = within(await openText(canvasElement));
        await userEvent.click(toolbar.getByRole('button', { name: copy.addText }));
        const menu = await waitForOpen('dialog');
        await userEvent.click(within(menu).getByRole('button', { name: copy.addParagraph }));
        // The invitation is in Greek, whatever the editor's language.
        await waitFor(() => expect(canvasElement.querySelector('.smd-text-active')).toHaveTextContent('Νέα παράγραφος'));
    },
};

// A section's own text asks before it is emptied.
export const DeleteSectionText: Story = {
    play: async ({ canvasElement, globals }) => {
        const toolbar = within(await openText(canvasElement, SECTION_TEXT));
        await userEvent.click(toolbar.getByRole('button', { name: copyFor(globals).InvitationEditor.deleteText }));
        const dialog = await waitForOpen('dialog');
        await expect(dialog).toHaveTextContent(copyFor(globals).InvitationEditor.deleteTextTitle);
    },
};
