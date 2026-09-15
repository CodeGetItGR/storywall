'use client';

import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import type { PublishJob } from '@/providers/publishQueue/PublishQueueContext';

const SUCCESS_DISMISS_DELAY_MS = 1500;

interface PublishQueueCardProps {
    job: PublishJob;
    onRetry: (jobId: string) => void;
    onDismiss: (jobId: string) => void;
}

export function PublishQueueCard({ job, onRetry, onDismiss }: PublishQueueCardProps) {
    const t = useTranslations('PublishQueue');

    useEffect(() => {
        if (job.status !== 'success') return;
        const timeout = setTimeout(() => onDismiss(job.id), SUCCESS_DISMISS_DELAY_MS);
        return () => clearTimeout(timeout);
    }, [job.id, job.status, onDismiss]);

    const pendingLabel = job.kind === 'post' ? t('postingPost') : t('postingStory', { count: job.totalCount });
    const successLabel = job.kind === 'post' ? t('posted') : t('storyPosted', { count: job.postedCount || job.totalCount });
    const errorLabel =
        job.kind === 'post' ? (job.error ?? t('postFailed')) : t('storyPostFailed', { failed: job.payload.items.length, total: job.totalCount });

    function handleRetryClick() {
        onRetry(job.id);
    }

    function handleDismissClick() {
        onDismiss(job.id);
    }

    return (
        <article className="mx-2 mb-2 flex items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 text-sm">
            {job.status === 'pending' && (
                <>
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-ink">{pendingLabel}</span>
                </>
            )}
            {job.status === 'success' && (
                <>
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-white" aria-hidden="true">
                        <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">{successLabel}</span>
                </>
            )}
            {job.status === 'error' && (
                <>
                    <span className="min-w-0 flex-1 truncate text-destructive">{errorLabel}</span>
                    <button type="button" onClick={handleRetryClick} className="shrink-0 text-sm font-semibold text-primary underline">
                        {t('retry')}
                    </button>
                    <button
                        type="button"
                        onClick={handleDismissClick}
                        aria-label={t('dismiss')}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-faint hover:text-ink"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </>
            )}
        </article>
    );
}
