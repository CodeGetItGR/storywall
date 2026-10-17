import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { desktopOnly } from '@/.storybook/modes';
import { DesktopNavRail } from '@/components/layout/DesktopNavRail';

const meta = {
    title: 'Layout/DesktopNavRail',
    component: DesktopNavRail,
    globals: { viewport: { value: 'desktop' } },
    parameters: {
        layout: 'fullscreen',
        ...desktopOnly,
        nextjs: { navigation: { pathname: '/home' } },
    },
    // The rail's warm gradient comes from the shell around it.
    decorators: [
        withAppContext,
        (Story) => (
            <div className="desktop-account-shell h-screen">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof DesktopNavRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {};

// On an event page the rail adds a link back to the event's home.
export const OnEventPage: Story = {
    parameters: { nextjs: { navigation: { pathname: '/events/evt-story/feed' } } },
};

export const WithUnreadNotifications: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/notifications/unread-count', () => HttpResponse.json({ unreadCount: 4 })));
    },
};

export const Expanded: Story = {
    parameters: { nextjs: { navigation: { pathname: '/events/evt-story/feed' } } },
    async play({ canvasElement }) {
        await userEvent.hover(within(canvasElement).getByRole('navigation'));
    },
};
