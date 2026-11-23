import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';

import { waitForOpen } from '@/.storybook/waitForOpen';
import { TextStyleDrawer } from '@/components/admin/textStyles/TextStyleDrawer';
import type { TextStylePresetDto } from '@/lib/api/types';

const PRESET: TextStylePresetDto = {
    id: 'p1',
    nameEn: 'Title',
    nameEl: 'Τίτλος',
    font: "'Playfair Display',serif",
    size: 40,
    weight: 'BOLD',
    italic: true,
    letterSpacing: 2,
    uppercase: true,
    sortOrder: 0,
};

// The drawer portals itself to the body, with the console's palette on it.
const meta = {
    title: 'Admin/TextStyles/TextStyleDrawer',
    component: TextStyleDrawer,
    args: {
        preset: null,
        isSaving: false,
        isDeleting: false,
        error: null,
        onSaveAction: fn(),
        onDeleteAction: fn(),
        onCloseAction: fn(),
    },
    async play() {
        await expect(await waitForOpen('dialog')).toBeVisible();
    },
} satisfies Meta<typeof TextStyleDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

// A new style: empty names, no font yet, Save off.
export const New: Story = {};

// A saved style, its preview drawn in it, with Delete.
export const Editing: Story = { args: { preset: PRESET } };

// Saving: the buttons are off and the drawer can't be closed.
export const Saving: Story = { args: { preset: PRESET, isSaving: true } };
