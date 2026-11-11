import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/adminShell';
import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { storyInvitationTexts } from '@/components/admin/saveMyDate/saveMyDateStoryData';
import { InvitationTextsPanel } from '@/components/admin/saveMyDate/texts/InvitationTextsPanel';
import { storyEventTypes } from '@/components/admin/saveMyDate/themes/invitationThemeStoryData';

// Save my date → Texts: ready-made wording per event type and language.
const meta = {
    title: 'Admin/SaveMyDate/Texts/InvitationTextsPanel',
    component: InvitationTextsPanel,
    decorators: [withAdminShell],
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/admin/invitation-texts', () => HttpResponse.json(storyInvitationTexts)),
            http.get('*/api/admin/platform-event-types', () => HttpResponse.json(storyEventTypes)),
        );
    },
} satisfies Meta<typeof InvitationTextsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

export const Empty: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/admin/invitation-texts', () => HttpResponse.json([])));
    },
};

// The spinner turns, so the visual check skips it.
export const Loading: Story = {
    tags: ['visual-skip'],
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/admin/invitation-texts', async () => {
                await delay('infinite');
                return HttpResponse.json([]);
            }),
        );
    },
};

export const Failed: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/admin/invitation-texts', () => HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 })));
    },
};

export const EditText: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals).AdminPage.invitationThemes;
        await userEvent.click(await canvas.findByRole('button', { name: copy.edit.replace('{name}', 'Επίσημο') }));
        await waitForOpen('dialog');
    },
};

export const NewText: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: copyFor(globals).AdminPage.saveMyDate.texts.create }));
        await waitForOpen('dialog');
    },
};

// Save with nothing filled in: both checks show.
export const Incomplete: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals).AdminPage;
        await userEvent.click(await canvas.findByRole('button', { name: copy.saveMyDate.texts.create }));
        const drawer = within(await waitForOpen('dialog'));
        await userEvent.click(drawer.getByRole('button', { name: copy.invitationThemes.drawer.save }));
        await drawer.findByText(copy.saveMyDate.checks.upTo2000);
    },
};

// The delete confirmation over the drawer.
export const ConfirmDelete: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals).AdminPage;
        await userEvent.click(await canvas.findByRole('button', { name: copy.invitationThemes.edit.replace('{name}', 'Επίσημο') }));
        const drawer = within(await waitForOpen('dialog'));
        await userEvent.click(drawer.getByRole('button', { name: copy.saveMyDate.texts.delete }));
        await within(document.body).findByText(copy.saveMyDate.texts.deleteTitle);
    },
};
