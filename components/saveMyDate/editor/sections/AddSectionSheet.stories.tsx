import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { AddSectionSheet } from '@/components/saveMyDate/editor/sections/AddSectionSheet';
import { SAMPLE_DOCUMENT } from '@/lib/invitation/samples';
import { addableSectionTypes } from '@/lib/invitation/sectionRules';

// Everything a wedding may add, before any section is on the page.
const weddingTypes = addableSectionTypes({ ...SAMPLE_DOCUMENT, sections: [] }, 'WEDDING', 'host');

const meta = {
    title: 'SaveMyDate/Editor/Sections/AddSectionSheet',
    component: AddSectionSheet,
    args: { open: true, types: weddingTypes, onAdd: fn(), onClose: fn() },
} satisfies Meta<typeof AddSectionSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async () => {
        await expect(await waitForOpen('dialog')).toBeVisible();
    },
};

// Every section is on the page already.
export const NothingToAdd: Story = {
    args: { types: [] },
    play: async ({ globals }) => {
        const dialog = await waitForOpen('dialog');
        await expect(within(dialog).getByText(copyFor(globals).InvitationEditor.sections.nothingToAdd)).toBeVisible();
    },
};

// The sheet only reports the pick; the editor adds the section.
export const Pick: Story = {
    tags: ['visual-skip'],
    play: async ({ args, globals }) => {
        const dialog = await waitForOpen('dialog');
        await userEvent.click(within(dialog).getByRole('button', { name: copyFor(globals).InvitationEditor.sectionNames.photo }));
        await expect(args.onAdd).toHaveBeenCalledWith('photo');
    },
};
