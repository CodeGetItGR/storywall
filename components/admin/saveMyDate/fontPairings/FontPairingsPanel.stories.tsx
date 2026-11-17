import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/adminShell';
import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { FontPairingsPanel } from '@/components/admin/saveMyDate/fontPairings/FontPairingsPanel';
import {
    storyFontFileHandlers,
    storyFontPairings,
    storyInvitationFontFiles,
    storyInvitationFonts,
} from '@/components/admin/saveMyDate/saveMyDateStoryData';
import { storyEventTypes } from '@/components/admin/saveMyDate/themes/invitationThemeStoryData';

// Save my date → Font pairings: the title, text and button fonts the editor offers together.
const meta = {
    title: 'Admin/SaveMyDate/FontPairings/FontPairingsPanel',
    component: FontPairingsPanel,
    decorators: [withAdminShell],
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/admin/invitation-typography-presets', () => HttpResponse.json(storyFontPairings)),
            http.get('*/api/admin/platform-event-types', () => HttpResponse.json(storyEventTypes)),
            http.get('*/api/admin/theme-fonts', () => HttpResponse.json(storyInvitationFonts)),
            http.get('*/api/invitation-fonts/files', () => HttpResponse.json(storyInvitationFontFiles)),
            http.patch('*/api/admin/invitation-typography-presets/:id', () => new HttpResponse(null, { status: 204 })),
            ...storyFontFileHandlers,
        );
    },
} satisfies Meta<typeof FontPairingsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

export const Empty: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/admin/invitation-typography-presets', () => HttpResponse.json([])));
    },
};

// The spinner turns, so the visual check skips it.
export const Loading: Story = {
    tags: ['visual-skip'],
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/admin/invitation-typography-presets', async () => {
                await delay('infinite');
                return HttpResponse.json([]);
            }),
        );
    },
};

export const Failed: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/admin/invitation-typography-presets', () => HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 })),
        );
    },
};

// A move the server turned down: the error shows above the list.
export const MoveFailed: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.patch('*/api/admin/invitation-typography-presets/:id', () => HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 })),
        );
    },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals).AdminPage;
        await userEvent.click(await canvas.findByRole('button', { name: copy.order.moveDown.replace('{name}', 'Κλασικό') }));
        await canvas.findByText(copy.errors.generic);
    },
};

// A pairing with an uploaded title font and its own button font, open in the drawer.
export const EditPairing: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals).AdminPage.invitationThemes;
        await userEvent.click(await canvas.findByRole('button', { name: copy.edit.replace('{name}', 'Ρομαντικό') }));
        await waitForOpen('dialog');
    },
};

export const NewPairing: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: copyFor(globals).AdminPage.saveMyDate.fontPairings.create }));
        await waitForOpen('dialog');
    },
};

// Save with no name: the name check shows.
export const NameMissing: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals).AdminPage;
        await userEvent.click(await canvas.findByRole('button', { name: copy.saveMyDate.fontPairings.create }));
        const drawer = within(await waitForOpen('dialog'));
        await userEvent.click(drawer.getByRole('button', { name: copy.invitationThemes.drawer.save }));
        await drawer.findByText(copy.saveMyDate.checks.upTo100);
    },
};
