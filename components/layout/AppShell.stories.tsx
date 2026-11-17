import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { AppShell } from '@/components/layout/AppShell';

function SamplePage() {
    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
            <h1 className="text-2xl font-semibold text-ink">Eleni &amp; Nikos</h1>
            <p className="mt-2 text-sm text-ink-muted">Page content goes here.</p>
        </div>
    );
}

// The signed-in frame: the desktop rail, the page, and the mobile tab bar.
const meta = {
    title: 'Layout/AppShell',
    component: AppShell,
    args: { children: <SamplePage /> },
    parameters: {
        layout: 'fullscreen',
        nextjs: { navigation: { pathname: '/events/evt-story/feed' } },
    },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="h-screen">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignedIn: Story = {};

// Account pages keep no room for the tab bar.
export const AccountPage: Story = {
    parameters: { nextjs: { navigation: { pathname: '/home' } } },
};

export const CheckingSession: Story = {
    parameters: { app: { isBootstrapping: true } },
};

export const SessionUnavailable: Story = {
    parameters: { app: { isBootstrapping: true, isSessionUnavailable: true } },
};
