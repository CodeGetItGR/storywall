import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { storyUser } from '@/.storybook/fixtures';
import { ComposerCard } from '@/components/feed/ComposerCard';

const meta = {
    title: 'Feed/ComposerCard',
    component: ComposerCard,
    decorators: [
        withAppContext,
        (Story) => (
            <div className="mx-auto max-w-2xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ComposerCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithProfilePhoto: Story = {
    parameters: { app: { user: { ...storyUser, profilePictureUrl: '/images/couple-hero.png' } } },
};
