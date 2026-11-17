import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { ComposerFab } from '@/components/layout/mobile-tab-bar/ComposerFab';
import { OverviewFabButton } from '@/components/layout/mobile-tab-bar/OverviewFabButton';

const meta = {
    title: 'Layout/MobileTabBar/OverviewFabButton',
    component: OverviewFabButton,
    args: { href: '/events/e1/manage', label: 'Overview', count: 3, raised: false, hidden: false },
    globals: { viewport: { value: 'mobile' } },
    parameters: { layout: 'fullscreen' },
    tags: ['visual-mobile-only'],
    decorators: [
        withAppContext,
        (Story) => (
            <div className="h-screen">
                <Story />
            </div>
        ),
    ],
    render: (args, { globals }) => <OverviewFabButton {...args} label={copyFor(globals).ManagePage.sections.overview} />,
} satisfies Meta<typeof OverviewFabButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// A tool page: it takes the spot "+" has on the feed.
export const WithCount: Story = {};

// The feed: it sits above "+".
export const AboveComposer: Story = {
    args: { raised: true },
    render: (args, { globals }) => (
        <>
            <OverviewFabButton {...args} label={copyFor(globals).ManagePage.sections.overview} />
            <ComposerFab hidden={false} />
        </>
    ),
};

// Nothing left in this phase: the button stays, with no badge.
export const NoBadge: Story = { args: { count: 0 } };

// After the day there is no count.
export const AfterTheDay: Story = { args: { count: null } };

// Scales away while a sheet or menu is open.
export const Hidden: Story = { args: { hidden: true } };
