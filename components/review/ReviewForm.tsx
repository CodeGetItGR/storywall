'use client';

import { useTranslations } from 'next-intl';

import { ReviewStars } from '@/components/review/ReviewStars';
import { Button } from '@/components/ui/button';
import { type ReviewFormValues, useReviewForm } from '@/hooks/useReviewForm';
import { REVIEW_COMMENT_MAX } from '@/lib/reviews';

export function ReviewForm({
    eventTitle,
    isSending,
    error,
    onSubmitAction,
    onNotNowAction,
}: {
    eventTitle: string;
    isSending: boolean;
    error: string | null;
    onSubmitAction: (values: ReviewFormValues) => void;
    onNotNowAction: () => void;
}) {
    const t = useTranslations('ReviewPrompt');
    const form = useReviewForm(onSubmitAction);

    return (
        <form className="flex flex-col gap-5" onSubmit={form.handleSubmit}>
            {/* Header */}
            <h2 className="pr-10 text-lg font-bold text-ink">{t('title', { eventTitle })}</h2>

            {/* Rating */}
            <ReviewStars value={form.stars} onChangeAction={form.setStars} />

            {/* Comment */}
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
                {t('comment')}
                <textarea
                    value={form.comment}
                    onChange={form.handleCommentChange}
                    maxLength={REVIEW_COMMENT_MAX}
                    rows={3}
                    className="resize-none rounded-2xl bg-surface-muted px-4 py-3 text-sm font-normal text-ink focus-ring"
                />
            </label>

            {/* Consent */}
            {form.showConsent ? (
                <label className="flex items-center gap-3 text-sm text-ink">
                    <input type="checkbox" checked={form.consent} onChange={form.handleConsentChange} className="h-5 w-5 accent-primary" />
                    {t('consent')}
                </label>
            ) : null}

            {/* Error */}
            {error ? <p className="text-sm text-status-danger">{error}</p> : null}

            {/* Actions */}
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="lg" onClick={onNotNowAction}>
                    {t('notNow')}
                </Button>
                <Button type="submit" size="lg" disabled={!form.canSend || isSending}>
                    {t('send')}
                </Button>
            </div>
        </form>
    );
}
