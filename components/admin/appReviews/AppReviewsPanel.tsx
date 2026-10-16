'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { AppReviewDrawer } from '@/components/admin/appReviews/AppReviewDrawer';
import { AppReviewsTable } from '@/components/admin/appReviews/AppReviewsTable';
import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppReviewsPanel } from '@/hooks/useAppReviewsPanel';
import type { AppReviewStatus } from '@/lib/api/types';
import { APP_REVIEW_STATUSES } from '@/lib/reviews';
import { cn } from '@/lib/utils';

const FILTERS: (AppReviewStatus | null)[] = [null, ...APP_REVIEW_STATUSES];

export function AppReviewsPanel() {
    const t = useTranslations('AdminPage.appReviews');
    const panel = useAppReviewsPanel();
    const toErrorMessage = useApiErrorMessage();
    const data = panel.reviewsQuery.data;

    function handleFilter(event: MouseEvent<HTMLButtonElement>) {
        panel.setStatus((event.currentTarget.dataset.status || null) as AppReviewStatus | null);
    }

    return (
        <section className="space-y-6">
            {/* Page heading */}
            <header className="border-b border-border pb-5">
                <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('title')}</h2>
            </header>

            {/* Filter */}
            <div role="group" aria-label={t('filter')} className="flex w-fit gap-1 rounded-lg bg-canvas p-1">
                {FILTERS.map((option) => (
                    <button
                        key={option ?? 'all'}
                        type="button"
                        data-status={option ?? ''}
                        onClick={handleFilter}
                        aria-pressed={panel.status === option}
                        className={cn(
                            'rounded-md px-3 py-1.5 text-[12.5px] font-bold transition-colors',
                            panel.status === option ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                        )}
                    >
                        {option ? t(`status.${option}`) : t('all')}
                    </button>
                ))}
            </div>

            {/* Review list */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
                {panel.reviewsQuery.isLoading ? <LoadingState label={t('loading')} className="min-h-48" /> : null}
                {panel.reviewsQuery.error ? (
                    <p className="px-5 py-12 text-center text-sm text-status-danger">{toErrorMessage(panel.reviewsQuery.error)}</p>
                ) : null}
                {data && !panel.reviewsQuery.error && data.content.length === 0 ? <p className="px-5 py-14 text-center text-sm text-ink-muted">{t('empty')}</p> : null}
                {data && !panel.reviewsQuery.error && data.content.length > 0 ? (
                    <>
                        <AppReviewsTable reviews={data.content} onOpenAction={panel.openReview} />
                        <AdminPagination
                            pageInfo={data.page}
                            page={panel.page}
                            summary={t('count', { count: data.page.totalElements })}
                            onPageChangeAction={panel.setPage}
                        />
                    </>
                ) : null}
            </section>

            {/* Review detail */}
            {panel.selected ? (
                <AppReviewDrawer
                    key={panel.selected.id}
                    review={panel.selected}
                    isSaving={panel.isSaving}
                    error={panel.patchError}
                    onPatchAction={panel.patchSelected}
                    onCloseAction={panel.closeReview}
                />
            ) : null}
        </section>
    );
}
