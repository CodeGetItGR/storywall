import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorChrome } from '@/.storybook/editor';
import { SectionSettingsStory } from '@/.storybook/sectionSettings';

// A section's settings docked beside the canvas on computers, in place of the text settings.
const meta = {
    title: 'SaveMyDate/Editor/SectionSettingsDocked',
    component: SectionSettingsStory,
    decorators: [withEditorChrome],
    args: { sectionId: 's-date', isAdmin: false, isDocked: true, onClose: fn() },
    tags: ['visual-desktop-only'],
    globals: { viewport: { value: 'desktop' } },
} satisfies Meta<typeof SectionSettingsStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DateSection: Story = {
    play: async ({ canvas, globals }) => {
        await expect(canvas.getByRole('complementary', { name: copyFor(globals).InvitationEditor.sectionNames.date })).toBeVisible();
    },
};

export const AdminProgramIcons: Story = {
    args: { sectionId: 's-programIcons', isAdmin: true },
    play: async ({ canvas, globals }) => {
        await expect(canvas.getByRole('complementary', { name: copyFor(globals).InvitationEditor.sectionNames.programIcons })).toBeVisible();
    },
};
