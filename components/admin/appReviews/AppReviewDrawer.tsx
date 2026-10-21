'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { AppReviewStatusControl } from '@/components/admin/appReviews/AppReviewStatusControl';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { AdminAppReviewDto, AdminAppReviewPatchDto, AppReviewStatus } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export function AppReviewDrawer({
    review,
    isSaving,
    error,
    onPatchAction,
    onCloseAction,
}: {
    review: AdminAppReviewDto;
    isSaving: boolean;
    error: unknown;
    onPatchAction: (patch: AdminAppReviewPatchDto) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.appReviews');
    const locale = useLocale();
    const toErrorMessage = useApiErrorMessage();
    const canFeature = review.status === 'APPROVED' && review.publicConsent;

    function handleStatus(status: AppReviewStatus) {
        onPatchAction({ status });
    }

    function handleFeatured(featured: boolean) {
        onPatchAction({ featured });
    }

    return (
        <AdminDrawer
            open
            onClose={onCloseAction}
            closeLabel={t('close')}
            title={t('detailTitle')}
            subtitle={formatDate(locale, review.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
        >
            <div className="space-y-7">
                {/* Review */}
                <section className="space-y-2">
                    <p className="font-mono text-xs text-ink-muted">{t('stars', { count: review.stars })}</p>
                    <p className="text-sm leading-6 break-words whitespace-pre-wrap text-ink">{review.comment ?? t('noComment')}</p>
                    <p className="text-sm text-ink-muted">
                        {review.firstName} · {t(`role.${review.role}`)}
                    </p>
                    <p className="text-sm text-ink-muted">
                        {t('columns.consent')}: {review.publicConsent ? t('yes') : t('no')}
                    </p>
                </section>

                {/* Status */}
                <AppReviewStatusControl value={review.status} disabled={isSaving} onChangeAction={handleStatus} />

                {/* Landing */}
                <section className="overflow-hidden rounded-lg border border-border">
                    <AdminSwitch
                        label={t('featured')}
                        description={canFeature ? undefined : t('featuredNeeds')}
                        checked={review.featured}
                        disabled={isSaving || (!canFeature && !review.featured)}
                        onCheckedChangeAction={handleFeatured}
                    />
                </section>

                {/* Error */}
                {error ? (
                    <p role="alert" className="text-sm text-status-danger">
                        {toErrorMessage(error)}
                    </p>
                ) : null}

                {/* Identifiers */}
                <section className="grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
                    <AdminIdentifier label={t('reviewId')} value={review.id} />
                    <AdminIdentifier label={t('userId')} value={review.userId} />
                    <AdminIdentifier label={t('eventId')} value={review.eventId} />
                    <AdminIdentifier label={t('language')} value={review.locale} />
                </section>
            </div>
        </AdminDrawer>
    );
}
