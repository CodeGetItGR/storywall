import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useTranslations } from 'next-intl';
import { fn } from 'storybook/test';

import { PostModalStatus } from '@/components/feed/post/PostModalStatus';

function NotFoundStatus() {
    const t = useTranslations('PostModal');
    return <PostModalStatus title={t('notFoundTitle')} description={t('notFoundDescription')} />;
}

function LoadFailedStatus({ onAction }: { onAction: () => void }) {
    const t = useTranslations('PostModal');
    return <PostModalStatus title={t('loadFailedTitle')} actionLabel={t('tryAgain')} onAction={onAction} />;
}

const meta = {
    title: 'Feed/Post/PostModalStatus',
    component: PostModalStatus,
    args: { title: '', onAction: fn() },
} satisfies Meta<typeof PostModalStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotFound: Story = {
    render: () => <NotFoundStatus />,
};

export const LoadFailed: Story = {
    render: (args) => <LoadFailedStatus onAction={args.onAction ?? fn()} />,
};
