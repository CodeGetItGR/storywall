import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { storyReactionTypes } from '@/.storybook/fixtures';
import { ReactionSummary } from '@/components/feed/post/ReactionSummary';

// The two most used reactions and the total. Renders nothing without reactions.
const meta = {
    title: 'Feed/Post/ReactionSummary',
    component: ReactionSummary,
    args: { counts: { LOVE: 8, LAUGH: 3, WOW: 1 }, reactionTypes: storyReactionTypes },
} satisfies Meta<typeof ReactionSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Several: Story = {};

export const One: Story = {
    args: { counts: { WOW: 1 } },
};

export const ShowAll: Story = {
    args: { maxReactions: 3 },
};
