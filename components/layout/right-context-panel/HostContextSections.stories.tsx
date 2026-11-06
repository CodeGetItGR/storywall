import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { storyHostMember } from '@/.storybook/fixtures';
import { hostPanelHandlers } from '@/.storybook/handlers';
import { HostContextSections } from '@/components/layout/right-context-panel/HostContextSections';
import { useRightContextPanel } from '@/hooks/useRightContextPanel';

// HostContextSections reads its whole model from useRightContextPanel; this is
// how the manage page's overview places it, inline and without the member count.
function HostSections({ showMembersUsage }: { showMembersUsage: boolean }) {
    const panel = useRightContextPanel({ includeManageLinks: false });
    return <HostContextSections panel={panel} showMembersUsage={showMembersUsage} />;
}

const meta = {
    title: 'Layout/RightContextPanel/HostContextSections',
    component: HostSections,
    args: { showMembersUsage: true },
    parameters: {
        app: { member: storyHostMember },
        nextjs: { navigation: { pathname: '/events/evt-story/manage' } },
    },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="max-w-sm">
                <Story />
            </div>
        ),
    ],
    beforeEach({ msw }) {
        msw.use(...hostPanelHandlers());
    },
} satisfies Meta<typeof HostSections>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutMemberUsage: Story = {
    args: { showMembersUsage: false },
};

export const NothingYet: Story = {
    beforeEach({ msw }) {
        msw.use(...hostPanelHandlers({ empty: true }));
    },
};
