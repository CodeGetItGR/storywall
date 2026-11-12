import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyUser } from '@/.storybook/fixtures';
import { SaveMyDateAdminShell } from '@/components/admin/saveMyDate/SaveMyDateAdminShell';
import { InvitationThemesPanel } from '@/components/admin/saveMyDate/themes/InvitationThemesPanel';
import { storyEventTypes, storyThemeList } from '@/components/admin/saveMyDate/themes/invitationThemeStoryData';

const storyAdmin = { ...storyUser, userId: 'usr-admin', email: 'admin@storywall.gr', role: 'ADMIN' as const };

// The Save my date admin at /admin/save-my-date: its own menu, with Themes open.
const meta = {
    title: 'Admin/SaveMyDate/SaveMyDateAdminShell',
    component: SaveMyDateAdminShell,
    args: { children: <InvitationThemesPanel /> },
    parameters: {
        layout: 'fullscreen',
        app: { user: storyAdmin },
        nextjs: { navigation: { pathname: '/admin/save-my-date/themes' } },
    },
    globals: { viewport: { value: 'desktop' } },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="h-screen">
                <Story />
            </div>
        ),
    ],
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/admin/invitation-themes', () => HttpResponse.json(storyThemeList)),
            http.get('*/api/admin/platform-event-types', () => HttpResponse.json(storyEventTypes)),
        );
    },
} satisfies Meta<typeof SaveMyDateAdminShell>;

export default meta;
type Story = StoryObj<typeof meta>;

// Desktop first; the phone layout has its own stories below.
export const Themes: Story = {
    tags: ['visual-desktop-only'],
};

// The menu sits behind the menu button on a phone.
export const Mobile: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
};

export const MobileMenu: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals).AdminPage;
        await userEvent.click(await canvas.findByRole('button', { name: copy.saveMyDate.title }));
        await within(document.body).findByRole('link', { name: copy.saveMyDate.backToAdmin });
    },
};

// Marketing can open the console, not this page.
export const NotAnAdmin: Story = {
    parameters: { app: { user: { ...storyAdmin, role: 'MARKETING' } } },
};

// The spinner turns, so the visual check skips it.
export const CheckingSession: Story = {
    tags: ['visual-skip'],
    parameters: { app: { isBootstrapping: true } },
};
