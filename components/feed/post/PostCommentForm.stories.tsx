import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { PostCommentForm } from '@/components/feed/post/PostCommentForm';

type FormArgs = { initialValue: string; replyingTo: string | null; failed: boolean; inputDisabled: boolean };

// The labels come from the app's copy, as in the comments view.
function CommentForm({ initialValue, replyingTo, failed, inputDisabled }: FormArgs) {
    const t = useTranslations('PostModal');
    const [value, setValue] = useState(initialValue);
    return (
        <PostCommentForm
            value={value}
            onValueChange={setValue}
            onSubmit={fn()}
            error={failed ? t('commentFailed') : null}
            submitDisabled={value.trim().length === 0 || inputDisabled}
            inputDisabled={inputDisabled}
            placeholder={replyingTo ? t('replyPlaceholder') : t('commentPlaceholder')}
            inputAriaLabel={t('commentTextAriaLabel')}
            submitAriaLabel={t('postComment')}
            maxLength={300}
            replyingToLabel={replyingTo ? t('replyingTo', { name: replyingTo }) : null}
            onCancelReply={fn()}
            cancelReplyAriaLabel={t('cancelReply')}
        />
    );
}

const meta = {
    title: 'Feed/Post/PostCommentForm',
    component: CommentForm,
    args: { initialValue: '', replyingTo: null, failed: false, inputDisabled: false },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof CommentForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Typed: Story = {
    args: { initialValue: 'Congratulations to you both!' },
};

export const Replying: Story = {
    args: { replyingTo: 'Nikos Alexiou' },
};

export const Failed: Story = {
    args: { initialValue: 'Congratulations to you both!', failed: true },
};

export const Disabled: Story = {
    args: { inputDisabled: true },
};
