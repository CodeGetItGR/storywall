import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fireEvent, fn, userEvent, waitFor, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyTheme, themeConflictHandlers, themeHandlers, withEditorScreen } from '@/.storybook/editor';
import { storyUser } from '@/.storybook/fixtures';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { ThemeEditor } from '@/components/saveMyDate/editor/ThemeEditor';

const meta = {
    title: 'SaveMyDate/Editor/ThemeEditor',
    component: ThemeEditor,
    decorators: [withEditorScreen, withAppContext],
    // Only admins open the theme editor.
    parameters: { layout: 'fullscreen', app: { user: { ...storyUser, role: 'ADMIN' } } },
    args: { theme: storyTheme(), onReload: fn() },
    beforeEach({ msw }) {
        msw.use(...themeHandlers());
    },
} satisfies Meta<typeof ThemeEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

type EditorCopy = ReturnType<typeof copyFor>['InvitationEditor'];

// Waits as long as waitForOpen: a busy runner can take more than the default second.
const SLOW = { timeout: 10_000 };

// The docked panel's input on a wide screen, or the open sheet's on a phone.
function visibleInput(label: string) {
    const inputs = within(document.body).getAllByLabelText(label);
    return inputs.find((input) => input.checkVisibility()) ?? inputs[0];
}

async function changeMainColor(canvasElement: HTMLElement, copy: EditorCopy) {
    fireEvent.input(visibleInput(copy.themeStyle.mainColor), { target: { value: '#7a1f3d' } });
    await waitFor(() => expect(within(canvasElement).getByRole('button', { name: copy.undo })).toBeEnabled(), SLOW);
}

// A draft theme saves as you go: no Save button.
export const DraftTheme: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const canvas = within(canvasElement);
        await expect(canvas.queryByRole('button', { name: copy.save })).not.toBeInTheDocument();
        await changeMainColor(canvasElement, copy);
        await waitFor(() => expect(canvas.getByText(copy.saved)).toBeInTheDocument(), SLOW);
    },
};

// A live theme waits for Save.
export const LiveTheme: Story = {
    args: { theme: storyTheme({ status: 'ACTIVE' }) },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const canvas = within(canvasElement);
        const save = canvas.getByRole('button', { name: copy.save });
        await expect(save).toBeDisabled();

        await changeMainColor(canvasElement, copy);
        await expect(canvas.getByText(copy.unsaved)).toBeInTheDocument();
        await userEvent.click(save);
        await waitFor(() => expect(canvas.getByText(copy.saved)).toBeInTheDocument(), SLOW);
        await expect(save).toBeDisabled();
    },
};

// Another admin saved the theme first.
export const Conflict: Story = {
    args: { theme: storyTheme({ status: 'ACTIVE' }) },
    beforeEach({ msw }) {
        msw.use(...themeConflictHandlers());
    },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        await changeMainColor(canvasElement, copy);
        await userEvent.click(within(canvasElement).getByRole('button', { name: copy.save }));
        const dialog = await waitForOpen('dialog');
        await waitFor(() => expect(within(dialog).getByText(copy.themeConflictTitle)).toBeVisible(), SLOW);
    },
};

// A phone opens the theme's style as a sheet.
export const StyleSheet: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        await userEvent.click(within(canvasElement).getByRole('button', { name: copy.settings }));
        const sheet = await waitForOpen('dialog');
        await expect(within(sheet).getByLabelText(copy.themeStyle.mainColor)).toBeInTheDocument();
    },
};

// The family sections pick which of the theme's elements they show, right on the canvas.
export const ElementSlot: Story = {
    tags: ['visual-skip'],
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const pickers = await within(canvasElement).findAllByRole('combobox', { name: copy.assets.pickElement }, SLOW);
        const decorated = pickers.find((picker) => (picker as HTMLSelectElement).value !== '') ?? pickers[0];
        await userEvent.selectOptions(decorated, '');
        await waitFor(() => expect(within(canvasElement).getByRole('button', { name: copy.undo })).toBeEnabled(), SLOW);
    },
};
