import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { ReportProblemButton } from '@/components/betaFeedback/ReportProblemButton';
import { ComposerFab } from '@/components/layout/mobile-tab-bar/ComposerFab';

const meta = {
    title: 'BetaFeedback/ReportProblemButton',
    component: ReportProblemButton,
    args: { onClickAction: fn() },
    parameters: { layout: 'fullscreen' },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="h-screen">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ReportProblemButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// A page without a navigation rail.
export const Default: Story = {};

// The feed: level with the composer button on phones, right of the rail on desktop.
export const WithRailAndComposer: Story = {
    render: (args) => (
        <>
            {/* Stands in for the navigation rail */}
            <div className="desktop-account-rail fixed inset-y-0 left-0 hidden w-20 bg-surface-muted md:block" />
            <ReportProblemButton {...args} />
            <ComposerFab hidden={false} />
        </>
    ),
};

// The wide rail would sit over it.
export const AwayUnderWideRail: Story = {
    tags: ['visual-desktop-only'],
    render: (args) => (
        <>
            {/* Stands in for the wide navigation rail */}
            <div data-expanded="true" className="desktop-account-rail fixed inset-y-0 left-0 hidden w-80 bg-surface-muted md:block" />
            <ReportProblemButton {...args} />
        </>
    ),
};
