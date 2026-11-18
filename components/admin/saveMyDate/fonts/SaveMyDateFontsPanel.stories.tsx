import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/adminShell';
import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { SaveMyDateFontsPanel } from '@/components/admin/saveMyDate/fonts/SaveMyDateFontsPanel';
import { storyFontFileHandlers, storyInvitationFonts } from '@/components/admin/saveMyDate/saveMyDateStoryData';
import { storyEventTypes } from '@/components/admin/saveMyDate/themes/invitationThemeStoryData';

// Save my date → Fonts: its own font list, with the event types each font is offered to.
const meta = {
    title: 'Admin/SaveMyDate/Fonts/SaveMyDateFontsPanel',
    component: SaveMyDateFontsPanel,
    decorators: [withAdminShell],
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/admin/theme-fonts', () => HttpResponse.json(storyInvitationFonts)),
            http.get('*/api/admin/platform-event-types', () => HttpResponse.json(storyEventTypes)),
            ...storyFontFileHandlers,
        );
    },
} satisfies Meta<typeof SaveMyDateFontsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

export const Empty: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/admin/theme-fonts', () => HttpResponse.json([])));
    },
};

// The spinner turns, so the visual check skips it.
export const Loading: Story = {
    tags: ['visual-skip'],
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/admin/theme-fonts', async () => {
                await delay('infinite');
                return HttpResponse.json([]);
            }),
        );
    },
};

export const Failed: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/admin/theme-fonts', () => HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 })));
    },
};

// One font open: its event types and the Save my date availability.
export const EditFont: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals).AdminPage.themeFonts;
        await userEvent.click(await canvas.findByRole('button', { name: copy.edit.replace('{name}', 'Theos') }));
        await waitForOpen('dialog');
    },
};

export const NewFont: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: copyFor(globals).AdminPage.themeFonts.create }));
        await waitForOpen('dialog');
    },
};
