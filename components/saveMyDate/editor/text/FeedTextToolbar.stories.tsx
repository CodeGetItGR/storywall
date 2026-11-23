import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withEditorChrome } from '@/.storybook/editor';
import { FeedTextToolbar } from '@/components/saveMyDate/editor/text/FeedTextToolbar';
import { STORY_PRESETS } from '@/components/saveMyDate/editor/text/TextStyleMenu.stories';
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
    applyPreset: fn(),
    lock: null,
    lockHref: undefined,
};

const meta = {
    title: 'SaveMyDate/Editor/Text/FeedTextToolbar',
    component: FeedTextToolbar,
    decorators: [withEditorChrome],
    parameters: { layout: 'fullscreen' },
    args: {
        toolbar,
        anchor: null,
        canAdd: true,
        presets: STORY_PRESETS,
        text: 'Μαρία & Νίκος',
        onPreset: fn(),
        onAddLink: fn(),
        onDelete: fn(),
    },
} satisfies Meta<typeof FeedTextToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

// On a computer it floats over the text being edited.
export const Floating: Story = { tags: ['visual-desktop-only'] };

// On a phone it sits at the bottom, above the keyboard, and scrolls sideways.
export const Docked: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
};
