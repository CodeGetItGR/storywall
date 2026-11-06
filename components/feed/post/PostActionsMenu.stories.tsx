import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useTranslations } from 'next-intl';
import { fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { PostActionsMenu } from '@/components/feed/post/PostActionsMenu';

type MenuArgs = { canEdit: boolean; canDelete: boolean; canReport: boolean; canReportRole: boolean; isDeleting: boolean };

// The labels come from the app's copy, as in PostCard.
function PostMenu({ canEdit, canDelete, canReport, canReportRole, isDeleting }: MenuArgs) {
    const t = useTranslations('PostCard');
    const tRoles = useTranslations('MemberRoles');
    return (
        <PostActionsMenu
            moreLabel={t('moreOptions')}
            disabled={isDeleting}
            isDeleting={isDeleting}
            editLabel={canEdit ? t('editPost') : undefined}
            onEditAction={canEdit ? fn() : undefined}
            deleteLabel={canDelete ? t('deletePost') : undefined}
            onDeleteAction={canDelete ? fn() : undefined}
            reportLabel={t('reportPost')}
            onReportAction={canReport ? fn() : undefined}
            reportRoleLabel={canReportRole ? tRoles('reportRole') : undefined}
            onReportRoleAction={canReportRole ? fn() : undefined}
        />
    );
}

const meta = {
    title: 'Feed/Post/PostActionsMenu',
    component: PostMenu,
    args: { canEdit: false, canDelete: false, canReport: false, canReportRole: false, isDeleting: false },
    decorators: [
        (Story) => (
            <div className="flex justify-end p-4">
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement, globals }) => {
        const trigger = within(canvasElement).getByRole('button', { name: copyFor(globals).PostCard.moreOptions });
        if (!(trigger as HTMLButtonElement).disabled) await userEvent.click(trigger);
    },
} satisfies Meta<typeof PostMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Author: Story = {
    args: { canEdit: true, canDelete: true },
};

export const Host: Story = {
    args: { canDelete: true, canReport: true },
};

export const Guest: Story = {
    args: { canReport: true, canReportRole: true },
};

export const Deleting: Story = {
    args: { canEdit: true, canDelete: true, isDeleting: true },
};
