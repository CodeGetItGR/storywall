import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { AuthLoadingState } from '@/components/layout/AuthLoadingState';

const meta = {
    title: 'Layout/AuthLoadingState',
    component: AuthLoadingState,
    parameters: { layout: 'fullscreen', app: { isBootstrapping: true } },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="h-screen">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof AuthLoadingState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {};

// The server can't be reached while the session is checked.
export const SessionUnavailable: Story = {
    parameters: { app: { isBootstrapping: true, isSessionUnavailable: true } },
};
