'use client';

import { useTranslations } from 'next-intl';
import type React from 'react';
import { useState } from 'react';

import { Modal } from '@/components/ui/modal';
import { useAppConfig } from '@/hooks';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useUpdatePost } from '@/hooks/usePosts';
import type { PostResponseDto } from '@/lib/api/types';

interface EditPostModalProps {
    post: PostResponseDto;
    open: boolean;
    onCloseAction: () => void;
}

export function EditPostModal({ post, open, onCloseAction }: EditPostModalProps) {
    const t = useTranslations('PostCard');
    const toErrorMessage = useApiErrorMessage();
    const { data: appConfig } = useAppConfig();
    const updatePost = useUpdatePost(post.eventId);
    const maxContentLength = appConfig?.contentLimits.postContentMaxLength ?? 500;

    const [content, setContent] = useState(post.content ?? '');
    const [error, setError] = useState<string | null>(null);

    const trimmedContent = content.trim();
    const canSubmit = trimmedContent.length > 0 && trimmedContent !== (post.content ?? '').trim() && !updatePost.isPending;

    function handleContentChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        setContent(event.target.value.slice(0, maxContentLength));
    }

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) return;

        setError(null);
        try {
            await updatePost.mutateAsync({ id: post.id, patch: { content: trimmedContent } });
            onCloseAction();
        } catch (submitError) {
            setError(toErrorMessage(submitError, t('editPostFailed')));
        }
    }

    return (
        <Modal open={open} onClose={onCloseAction} size="sm" variant="sheet" closeLabel={t('cancel')}>
            <Modal.Body className="px-3 py-4 sm:p-5">
                <h2 className="mb-4 text-base font-semibold text-ink">{t('editPost')}</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <textarea
                        value={content}
                        onChange={handleContentChange}
                        aria-label={t('editPostAriaLabel')}
                        rows={4}
                        maxLength={maxContentLength}
                        autoFocus
                        className="min-h-36 w-full resize-none rounded-[1.5rem] bg-surface-muted px-5 py-4 text-base leading-relaxed text-ink placeholder:text-ink-faint outline-none transition focus:ring-2 focus:ring-primary/30 sm:min-h-32 sm:text-sm"
                    />
                    <div className="-mt-2 flex items-center justify-end text-xs text-ink-faint">
                        <span>{t('captionCharacterCount', { count: content.length, max: maxContentLength })}</span>
                    </div>

                    {error && <p className="text-xs text-destructive">{error}</p>}

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onCloseAction}
                            className="rounded-full bg-surface-muted px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {updatePost.isPending ? t('saving') : t('save')}
                        </button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
