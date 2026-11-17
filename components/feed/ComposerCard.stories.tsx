import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { storyUser } from '@/.storybook/fixtures';
import { ComposerCard } from '@/components/feed/ComposerCard';

const meta = {
    title: 'Feed/ComposerCard',
    component: ComposerCard,
    decorators: [
        withAppContext,
        // The feed renders this card in a flex column, which is what stretches it to full width.
        (Story) => (
            <div className="mx-auto flex max-w-2xl flex-col">
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
