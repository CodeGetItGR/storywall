import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { SectionSettingsStory } from '@/.storybook/sectionSettings';
import { waitForOpen } from '@/.storybook/waitForOpen';

// The settings lists that hosts add to, delete from and reorder: questions, people and places to stay.
const meta = {
    title: 'SaveMyDate/Editor/ListSettings',
    component: SectionSettingsStory,
    args: { sectionId: 's-faq', isAdmin: false, isDocked: false, onClose: fn() },
} satisfies Meta<typeof SectionSettingsStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Questions: Story = {
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor.sectionSettings;
        const sheet = within(await waitForOpen('dialog'));
        await expect(sheet.getByRole('heading', { name: copy.questions })).toBeVisible();
        await expect(sheet.getAllByRole('button', { name: copy.reorder })).toHaveLength(2);
        await expect(sheet.getByRole('button', { name: copy.addQuestion })).toBeVisible();
    },
};

// One question open, with its delete button.
export const QuestionOpen: Story = {
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const sheet = within(await waitForOpen('dialog'));
        await userEvent.click(sheet.getByRole('button', { name: 'Υπάρχει πάρκινγκ;' }));
        await expect(sheet.getByRole('group', { name: 'Υπάρχει πάρκινγκ;' })).toBeVisible();
        await expect(sheet.getByRole('button', { name: copy.delete })).toBeVisible();
    },
};

// Moving the first question down with the keyboard.
export const ReorderWithKeyboard: Story = {
    tags: ['visual-skip'],
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor.sectionSettings;
        const sheet = within(await waitForOpen('dialog'));
        sheet.getAllByRole('button', { name: copy.reorder })[0].focus();
        // Each key at a person's pace, so the drag can catch up with the row it is over.
        for (const key of ['[Space]', '[ArrowDown]', '[Space]']) {
            await userEvent.keyboard(key);
            await new Promise((resolve) => setTimeout(resolve, 300));
        }
        await waitFor(() => {
            const rows = sheet.getAllByRole('listitem').map((row) => row.textContent);
            expect(rows).toEqual(['Μπορώ να φέρω τα παιδιά μου;', 'Υπάρχει πάρκινγκ;']);
        });
    },
};

export const Godparents: Story = {
    args: { sectionId: 's-godparents' },
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor.sectionSettings;
        const sheet = within(await waitForOpen('dialog'));
        await expect(sheet.getByRole('button', { name: copy.addGodparent })).toBeVisible();
    },
};

export const Sponsors: Story = {
    args: { sectionId: 's-weddingSponsors' },
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor.sectionSettings;
        const sheet = within(await waitForOpen('dialog'));
        await expect(sheet.getByRole('button', { name: copy.addSponsor })).toBeVisible();
    },
};

// One place to stay open, with its details and links.
export const PlaceToStay: Story = {
    args: { sectionId: 's-accommodation' },
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor.sectionSettings;
        const sheet = within(await waitForOpen('dialog'));
        await userEvent.click(sheet.getByRole('button', { name: 'Ξενοδοχείο' }));
        await expect(sheet.getByLabelText(copy.address)).toBeVisible();
        await expect(sheet.getByLabelText(copy.mapLink)).toBeVisible();
    },
};
