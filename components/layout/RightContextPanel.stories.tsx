import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { storyEvent, storyHostMember, storyModules } from '@/.storybook/fixtures';
import { hostPanelHandlers } from '@/.storybook/handlers';
import { desktopOnly } from '@/.storybook/modes';
import { RightContextPanel } from '@/components/layout/RightContextPanel';

const meta = {
    title: 'Layout/RightContextPanel',
    component: RightContextPanel,
    globals: { viewport: { value: 'desktop' } },
    parameters: {
        layout: 'fullscreen',
        ...desktopOnly,
        nextjs: { navigation: { pathname: '/events/evt-story/feed' } },
    },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="flex h-screen justify-end">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof RightContextPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Guests get their tool links.
export const Guest: Story = {};

// Hosts get their actions, the RSVP, media and wishbook summaries, links and plan usage.
export const Host: Story = {
    parameters: { app: { member: storyHostMember } },
    beforeEach({ msw }) {
        msw.use(...hostPanelHandlers());
    },
};

export const HostWithNothingYet: Story = {
    parameters: {
        app: {
            member: storyHostMember,
            event: storyEvent({ rsvpSummary: { totalMembers: 1, attending: 0, declined: 0, noResponse: 1 } }),
        },
    },
    beforeEach({ msw }) {
        msw.use(...hostPanelHandlers({ empty: true }));
    },
};

// A draft has nothing to report yet: only the setup actions and plan usage.
export const HostDraftEvent: Story = {
    parameters: { app: { member: storyHostMember, event: storyEvent({ status: 'DRAFT', modules: storyModules(['posts', 'rsvp', 'gallery']) }) } },
    beforeEach({ msw }) {
        msw.use(...hostPanelHandlers());
    },
};

// Nothing shows while the event loads.
export const EventLoading: Story = {
    parameters: { app: { eventLoading: true } },
};
