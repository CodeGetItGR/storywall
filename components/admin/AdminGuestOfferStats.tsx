'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { AdminStatTile } from '@/components/admin/AdminStatTile';
import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import { LoadingState } from '@/components/ui/LoadingState';
import { GUEST_OFFER_STAT_RANGES, useAdminGuestOfferStats } from '@/hooks/useAdminGuestOfferStats';

// What guests did with the offer card over a range of days, each person counted once.
export function AdminGuestOfferStats() {
    const t = useTranslations('AdminPage.guestOffer.stats');
    const tOffer = useTranslations('AdminPage.guestOffer');
    const { days, setDays, stats, isLoading, loadFailed } = useAdminGuestOfferStats();
    const options = useMemo(
        () => GUEST_OFFER_STAT_RANGES.map((value) => ({ value, label: value === 0 ? t('all') : t('days', { days: value }) })),
        [t],
    );

    return (
        <section className="mb-6 space-y-3">
            {/* Range */}
            <FunnelSegmented label={t('range')} options={options} value={days} onChangeAction={setDays} />
            <p className="text-xs text-ink-muted">{t('people')}</p>

            {isLoading && <LoadingState label={tOffer('loading')} className="justify-start" />}
            {loadFailed && (
                <p role="alert" className="text-sm text-red-600">
                    {t('loadFailed')}
                </p>
            )}

            {/* Tiles */}
            {stats && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <AdminStatTile label={t('seen')} value={stats.seen} />
                    <AdminStatTile label={t('discovered')} value={stats.discovered} />
                    <AdminStatTile label={t('claimed')} value={stats.claimed} />
                    <AdminStatTile label={t('copied')} value={stats.copied} />
                    <AdminStatTile label={t('closed')} value={stats.closed} />
                    <AdminStatTile label={t('used')} value={stats.used} />
                </div>
            )}
        </section>
    );
}
