import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { fn, userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/adminShell';
import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { InvitationThemeDrawer } from '@/components/admin/invitationThemes/InvitationThemeDrawer';
import { storyTheme } from '@/components/admin/invitationThemes/invitationThemeStoryData';
import type { AdminInvitationThemeDto } from '@/lib/adminInvitationThemes';

const EVENT_TYPES = [
    { key: 'WEDDING', label: 'Wedding' },
    { key: 'BAPTISM', label: 'Baptism' },
    { key: 'BIRTHDAY', label: 'Birthday' },
    { key: 'BABY_SHOWER', label: 'Baby shower' },
    { key: 'GENDER_REVEAL', label: 'Gender reveal' },
];

function serve(theme: AdminInvitationThemeDto) {
    return http.get('*/api/admin/invitation-themes/:id', () => HttpResponse.json(theme));
}

const meta = {
    title: 'Admin/InvitationThemes/InvitationThemeDrawer',
    component: InvitationThemeDrawer,
    decorators: [withAdminShell],
    args: {
        themeId: 'theme-1',
        title: 'Γάμος 001',
        eventTypes: EVENT_TYPES,
        onCloseAction: fn(),
        onDuplicateAction: fn(),
        onPreviewAction: fn(),
    },
    beforeEach({ msw }) {
        msw.use(serve(storyTheme()));
    },
} satisfies Meta<typeof InvitationThemeDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

const openDrawer = async () => {
    const drawer = await waitForOpen('dialog');
    await within(drawer).findByDisplayValue('gamos-001');
    return drawer;
};

const showDrawer = async () => {
    await openDrawer();
};

export const Live: Story = { play: showDrawer };

export const Draft: Story = {
    beforeEach({ msw }) {
        msw.use(serve(storyTheme({ status: 'DRAFT', seoTitle: null, seoDescription: null })));
    },
    play: showDrawer,
};

export const Hidden: Story = {
    beforeEach({ msw }) {
        msw.use(serve(storyTheme({ status: 'HIDDEN' })));
    },
    play: showDrawer,
};

// A slug the backend would refuse: the field says why, and Duplicate waits for a save.
export const SlugInvalid: Story = {
    play: async ({ globals }) => {
        const drawer = await openDrawer();
        const slug = within(drawer).getByDisplayValue('gamos-001');
        await userEvent.clear(slug);
        await userEvent.type(slug, 'Gamos 001');
        await within(drawer).findByText(copyFor(globals).AdminPage.invitationThemes.drawer.slugInvalid);
    },
};

// Another admin saved the theme first.
export const SavedElsewhere: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.put('*/api/admin/invitation-themes/:id', () =>
                HttpResponse.json({ status: 409, errorCode: 5201, title: 'Conflict' }, { status: 409 }),
            ),
        );
    },
    play: async ({ globals }) => {
        const copy = copyFor(globals).AdminPage.invitationThemes.drawer;
        const drawer = await openDrawer();
        await userEvent.click(within(drawer).getByRole('button', { name: copyFor(globals).AdminPage.invitationThemes.status.HIDDEN }));
        await userEvent.click(within(drawer).getByRole('button', { name: copy.save }));
        await within(drawer).findByText(copy.stale);
    },
};

// The spinner turns, so the visual check skips it.
export const Loading: Story = {
    tags: ['visual-skip'],
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/admin/invitation-themes/:id', async () => {
                await delay('infinite');
                return HttpResponse.json({});
            }),
        );
    },
    play: async () => {
        await waitForOpen('dialog');
    },
};
