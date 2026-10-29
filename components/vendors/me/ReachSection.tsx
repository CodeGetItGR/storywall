'use client';

import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { formatReachCount, type ReachTile } from '@/lib/vendorReach';

// The vendor's reach in this event. Every number has one tile and is not restated anywhere else on the page.
export function ReachSection({
    tiles,
    partner,
    showPartnerAction,
    isLoading,
    loadFailed,
    onBecomePartnerAction,
}: {
    tiles: ReachTile[];
    partner: boolean;
    showPartnerAction: boolean;
    isLoading: boolean;
    loadFailed: boolean;
    onBecomePartnerAction: () => void;
}) {
    const t = useTranslations('Vendors.reach');
    const locale = useLocale();

    return (
        <section aria-labelledby="vendor-reach-title" aria-busy={isLoading || undefined} className="flex flex-col gap-3">
            {/* Title */}
            <h3 id="vendor-reach-title" className="text-sm font-semibold text-ink">
                {t('title')}
            </h3>

            {/* Tiles */}
            {loadFailed ? (
                <p className="text-sm text-ink-muted">{t('loadFailed')}</p>
            ) : isLoading ? (
                <div className="grid grid-cols-2 gap-2">
                    <div className="h-16 animate-pulse rounded-xl bg-surface-muted" />
                    <div className="h-16 animate-pulse rounded-xl bg-surface-muted" />
                </div>
            ) : (
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {tiles.map((tile) => (
                        <div key={tile.key} className="rounded-xl bg-surface-muted px-3 py-2.5">
                            <dt className="text-xs text-ink-muted">{t(`tiles.${tile.key}`)}</dt>
                            <dd className="mt-0.5 text-lg font-bold text-ink tabular-nums">{formatReachCount(locale, tile.value)}</dd>
                        </div>
                    ))}
                </dl>
            )}

            {/* Partner */}
            {!partner && !loadFailed && !isLoading && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-sm text-ink-muted">{t('partnerLine')}</p>
                    {showPartnerAction && (
                        <Button type="button" variant="link" size="sm" className="px-0" onClick={onBecomePartnerAction}>
                            {t('partnerAction')}
                        </Button>
                    )}
                </div>
            )}
        </section>
    );
}
