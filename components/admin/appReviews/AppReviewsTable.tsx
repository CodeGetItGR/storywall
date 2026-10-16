'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AppReviewStatusPill } from '@/components/admin/appReviews/AppReviewStatusPill';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import type { AdminAppReviewDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

export function AppReviewsTable({ reviews, onOpenAction }: { reviews: AdminAppReviewDto[]; onOpenAction: (id: string) => void }) {
    const t = useTranslations('AdminPage.appReviews');
    const locale = useLocale();
    const eventTypeCopy = useLocalizedAppEventTypeCopy();

    function handleOpen(event: MouseEvent<HTMLButtonElement>) {
        const id = event.currentTarget.dataset.reviewId;
        if (id) onOpenAction(id);
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
                {/* Columns */}
                <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-5 py-3 font-bold">{t('columns.received')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.rating')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.comment')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.role')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.occasion')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.consent')}</th>
                        <th className="px-5 py-3 font-bold">{t('statusTitle')}</th>
                    </tr>
                </thead>

                {/* Rows */}
                <tbody>
                    {reviews.map((review) => (
                        <tr key={review.id} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                            <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap text-ink-muted">
                                {formatDate(locale, review.createdAt, DATE_FORMAT)}
                            </td>
                            <td className="px-3 py-3.5 font-mono text-xs whitespace-nowrap text-ink">{t('stars', { count: review.stars })}</td>
                            <td className="px-3 py-3.5">
                                <button
                                    type="button"
                                    data-review-id={review.id}
                                    onClick={handleOpen}
                                    className="block max-w-md truncate text-left font-semibold text-ink hover:underline"
                                >
                                    {review.comment ?? t('noComment')}
                                </button>
                            </td>
                            <td className="px-3 py-3.5">
                                <span className="inline-flex rounded-full bg-status-neutral-wash px-2.5 py-1 text-[11px] font-bold text-status-neutral">
                                    {t(`role.${review.role}`)}
                                </span>
                            </td>
                            <td className="px-3 py-3.5 text-ink-muted">{eventTypeCopy(review.eventType).name}</td>
                            <td className="px-3 py-3.5">
                                <span
                                    className={
                                        review.publicConsent
                                            ? 'inline-flex rounded-full bg-status-good-wash px-2.5 py-1 text-[11px] font-bold text-status-good'
                                            : 'inline-flex rounded-full bg-status-neutral-wash px-2.5 py-1 text-[11px] font-bold text-status-neutral'
                                    }
                                >
                                    {review.publicConsent ? t('yes') : t('no')}
                                </span>
                            </td>
                            <td className="px-5 py-3.5">
                                <div className="flex flex-wrap gap-1.5">
                                    <AppReviewStatusPill status={review.status} />
                                    {review.featured ? (
                                        <span className="inline-flex rounded-full bg-status-good-wash px-2.5 py-1 text-[11px] font-bold text-status-good">
                                            {t('onLanding')}
                                        </span>
                                    ) : null}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
