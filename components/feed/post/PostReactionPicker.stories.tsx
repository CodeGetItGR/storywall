import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyPost } from '@/.storybook/fixtures';
import { PostReactionPicker } from '@/components/feed/post/PostReactionPicker';

// The reactions come from the wedding's reaction types in the app config.
const meta = {
    title: 'Feed/Post/PostReactionPicker',
    component: PostReactionPicker,
    args: { post: storyPost() },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="pt-16 pl-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof PostReactionPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotReacted: Story = {};

export const Reacted: Story = {
    args: { post: storyPost({ myReactionType: 'LAUGH', reactionCount: 1, reactionCounts: { LAUGH: 1 } }) },
};

export const MenuOpen: Story = {
    play: async ({ canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).PostCard.reactToPost }));
    },
};

export const Disabled: Story = {
    args: { disabled: true },
};

export const ReactionFailed: Story = {
    beforeEach({ msw }) {
        msw.use(http.post('*/reactions', () => HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 })));
    },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: copyFor(globals).PostCard.reactToPost }));
        await userEvent.click(canvas.getAllByRole('menuitemradio')[0]);
    },
};
