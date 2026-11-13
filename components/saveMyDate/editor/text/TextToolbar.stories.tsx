import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorChrome } from '@/.storybook/editor';
import { TextToolbar } from '@/components/saveMyDate/editor/text/TextToolbar';
import type { TextToolbarState } from '@/hooks/useTextToolbar';
import { BASE_TEXT_COLORS, INVITATION_FONTS, TEXT_SIZES, THEME_FONT } from '@/lib/invitation/textEditing';

const toolbar: TextToolbarState = {
    font: THEME_FONT,
    fontLabel: undefined,
    fonts: [...INVITATION_FONTS],
    size: 20,
    sizes: [...TEXT_SIZES],
    color: '#2f2b2d',
    swatches: [...BASE_TEXT_COLORS],
    bold: false,
    italic: true,
    align: 'center',
    lineHeight: undefined,
    setFont: fn(),
    setSize: fn(),
    setLineHeight: fn(),
    toggleBold: fn(),
    toggleItalic: fn(),
    setAlign: fn(),
    pickColor: fn(),
    add: fn(),
    followsEvent: false,
};

const meta = {
    title: 'SaveMyDate/Editor/Text/TextToolbar',
    component: TextToolbar,
    decorators: [withEditorChrome],
    parameters: { layout: 'fullscreen' },
    args: { toolbar, anchor: null, canAdd: true, onDelete: fn() },
} satisfies Meta<typeof TextToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

// On a computer, with no text under it: the canvas places it over the text being edited.
export const Default: Story = {
    tags: ['visual-desktop-only'],
    play: async ({ args, canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const bar = within(canvasElement).getByRole('toolbar', { name: copy.textTools });
        await userEvent.click(within(bar).getByRole('button', { name: copy.bold }));
        await expect(args.toolbar.toggleBold).toHaveBeenCalledOnce();
    },
};

// On a phone it sits at the bottom, above the keyboard, and scrolls sideways.
export const Docked: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
};

// A text with its own font, size, colour and spacing.
export const Styled: Story = {
    tags: ['visual-desktop-only'],
    args: {
        toolbar: {
            ...toolbar,
            font: "'Playfair Display',serif",
            fontLabel: 'Playfair Display',
            size: 48,
            color: '#c98f88',
            bold: true,
            italic: false,
            align: 'left',
            lineHeight: 1.5,
        },
    },
};

// The section takes no more texts.
export const CannotAdd: Story = {
    tags: ['visual-desktop-only'],
    args: { canAdd: false },
};

// A text that comes from the event, such as the date: editing it makes it the invitation's own.
export const FollowsTheEvent: Story = {
    args: { toolbar: { ...toolbar, followsEvent: true } },
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByText(copyFor(globals).InvitationEditor.sectionSettings.followEventHint)).toBeVisible();
    },
};
