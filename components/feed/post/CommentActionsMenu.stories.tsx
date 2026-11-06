import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { STORY_GUEST_MEMBER_ID, storyAuthor, storyComment, storyHostMember } from '@/.storybook/fixtures';
import { CommentActionsMenu } from '@/components/feed/post/CommentActionsMenu';

const myComment = storyComment('c-mine', {
    authorMemberId: STORY_GUEST_MEMBER_ID,
    author: storyAuthor({ memberId: STORY_GUEST_MEMBER_ID, displayName: 'Maria Papadopoulou', role: 'ATTENDEE' }),
});

async function openMenu({ canvasElement, globals }: { canvasElement: HTMLElement; globals: Record<string, unknown> }) {
    await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).PostModal.moreCommentOptions }));
}

// A guest looking at someone else's comment can report it.
const meta = {
    title: 'Feed/Post/CommentActionsMenu',
    component: CommentActionsMenu,
    args: { comment: storyComment('c1') },
    decorators: [withAppContext],
    play: openMenu,
} satisfies Meta<typeof CommentActionsMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OthersComment: Story = {};

export const MyComment: Story = {
    args: { comment: myComment },
};

// Hosts can remove any comment.
export const HostView: Story = {
    parameters: { app: { member: storyHostMember } },
};

export const ConfirmDelete: Story = {
    args: { comment: myComment },
    play: async (context) => {
        await openMenu(context);
        await userEvent.click(await within(document.body).findByRole('menuitem', { name: copyFor(context.globals).PostModal.deleteComment }));
    },
};
