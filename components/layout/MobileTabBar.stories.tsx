import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyEvent, storyHostMember, storyQrLink } from '@/.storybook/fixtures';
import { mobileOnly } from '@/.storybook/modes';
import { MobileTabBar } from '@/components/layout/MobileTabBar';

const FEED_PATH = '/events/evt-story/feed';

const meta = {
    title: 'Layout/MobileTabBar',
    component: MobileTabBar,
    globals: { viewport: { value: 'mobile' } },
    parameters: {
        layout: 'fullscreen',
        ...mobileOnly,
        nextjs: { navigation: { pathname: FEED_PATH } },
    },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="h-screen">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof MobileTabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// A guest on the feed: home, music, tools, account, and the compose button.
export const Guest: Story = {};

export const GuestToolsOpen: Story = {
    async play({ canvasElement, globals }) {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).MobileTabBar.toolsMenu }));
    },
};

// A host also gets the RSVP tab and, once the invite link exists, the share tab.
export const Host: Story = {
    parameters: { app: { member: storyHostMember } },
    beforeEach({ msw }) {
        msw.use(http.get('*/api/events/:eventId/qr-links', () => HttpResponse.json([storyQrLink()])));
    },
};

export const HostDraftEvent: Story = {
    parameters: { app: { member: storyHostMember, event: storyEvent({ status: 'DRAFT' }) } },
};

// Off the feed there is no compose button.
export const OffTheFeed: Story = {
    parameters: { nextjs: { navigation: { pathname: '/events/evt-story/tools/schedule' } } },
};

// Nothing shows while the event loads.
export const EventLoading: Story = {
    parameters: { app: { eventLoading: true } },
};
