import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SessionUnavailableState } from '@/components/layout/SessionUnavailableState';

const meta = {
    title: 'Layout/SessionUnavailableState',
    component: SessionUnavailableState,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div className="h-screen">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof SessionUnavailableState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
