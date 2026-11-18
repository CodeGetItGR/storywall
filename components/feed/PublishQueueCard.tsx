'use client';

import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { useSlowUpload } from '@/hooks/useSlowUpload';
import { cn } from '@/lib/utils';
import type { PublishJob } from '@/providers/publishQueue/PublishQueueContext';

const SUCCESS_DISMISS_DELAY_MS = 4000;

function getJobLabels(job: PublishJob, t: ReturnType<typeof useTranslations<'PublishQueue'>>) {
    if (job.kind === 'post') return { pending: t('postingPost'), success: t('posted'), error: job.error ?? t('postFailed') };
    if (job.kind === 'song') return { pending: t('addingSong'), success: t('songAdded'), error: job.error ?? t('songFailed') };
    return {
        pending: t('postingStory', { count: job.totalCount }),
        success: t('storyPosted', { count: job.postedCount || job.totalCount }),
        error: job.failureReason ?? t('storyPostFailed', { failed: job.payload.items.length, total: job.totalCount }),
    };
}

interface PublishQueueCardProps {
    job: PublishJob;
    onRetry: (jobId: string) => void;
    onDismiss: (jobId: string) => void;
    // Set once the job's files can go to the phone's share menu: the success card then shows
    // Share and stays until the guest taps Share or ✕.
    onShare?: (jobId: string) => void;
}

export function PublishQueueCard({ job, onRetry, onDismiss, onShare }: PublishQueueCardProps) {
    const t = useTranslations('PublishQueue');
    // Songs send no files, so only posts and stories can be slow to upload.
    const isSlow = useSlowUpload(job.status === 'pending' && job.kind !== 'song');
    const canShare = Boolean(onShare);

    useEffect(() => {
        if (job.status !== 'success' || canShare) return;
        const timeout = setTimeout(() => onDismiss(job.id), SUCCESS_DISMISS_DELAY_MS);
        return () => clearTimeout(timeout);
    }, [job.id, job.status, onDismiss, canShare]);

    const labels = getJobLabels(job, t);

    function handleRetryClick() {
        onRetry(job.id);
    }

    function handleDismissClick() {
        onDismiss(job.id);
    }

    function handleShareClick() {
        onShare?.(job.id);
    }

    return (
        <article className="mx-2 mb-2 flex items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 text-sm">
            {job.status === 'pending' && (
                <>
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary" aria-hidden="true" />
                    <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-ink">{job.busy ? t('uploadBusy') : labels.pending}</span>
                        {/* Slow connection */}
                        {isSlow && !job.busy && (
                            <span role="status" className="mt-0.5 text-xs leading-snug text-ink-muted">
                                {t('uploadSlow')}
                            </span>
                        )}
                    </span>
                </>
            )}
            {job.status === 'success' && (
                <>
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-white" aria-hidden="true">
                        <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className={cn('min-w-0 flex-1 text-ink', canShare ? 'line-clamp-2 leading-snug' : 'truncate')}>{labels.success}</span>
                    {/* Share */}
                    {canShare && (
                        <>
                            <button
                                type="button"
                                onClick={handleShareClick}
                                className="flex min-h-9 shrink-0 items-center rounded-full bg-primary px-3.5 text-sm font-semibold text-primary-foreground"
                            >
                                {t('share')}
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
                </>
            )}
            {job.status === 'error' && (
                <>
                    <span className="min-w-0 flex-1 truncate text-destructive">{labels.error}</span>
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
