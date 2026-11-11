import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/adminShell';
import { copyFor } from '@/.storybook/copy';
import { InvitationThemesPanel } from '@/components/admin/invitationThemes/InvitationThemesPanel';
import { storyEventTypes, storyThemeList } from '@/components/admin/invitationThemes/invitationThemeStoryData';

const meta = {
    title: 'Admin/InvitationThemes/InvitationThemesPanel',
    component: InvitationThemesPanel,
    decorators: [withAdminShell],
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/admin/invitation-themes', () => HttpResponse.json(storyThemeList)),
            http.get('*/api/admin/platform-event-types', () => HttpResponse.json(storyEventTypes)),
        );
    },
} satisfies Meta<typeof InvitationThemesPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

// Only live wedding themes, from the filters.
export const Filtered: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals).AdminPage.invitationThemes;
        await canvas.findByText('gamos-001');
        await userEvent.click(await canvas.findByRole('button', { name: storyEventTypes[0].name[globals.locale === 'el' ? 'el' : 'en'] }));
        await userEvent.click(canvas.getByRole('button', { name: copy.status.ACTIVE }));
    },
};

export const NoMatches: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await userEvent.type(await canvas.findByRole('searchbox', { name: copyFor(globals).AdminPage.invitationThemes.search }), 'zzz');
    },
};

export const Empty: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/admin/invitation-themes', () => HttpResponse.json([])));
    },
};

// The spinner turns, so the visual check skips it.
export const Loading: Story = {
    tags: ['visual-skip'],
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/admin/invitation-themes', async () => {
                await delay('infinite');
                return HttpResponse.json([]);
            }),
        );
    },
};

export const Failed: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/admin/invitation-themes', () => HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 })));
    },
};
