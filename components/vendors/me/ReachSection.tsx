'use client';

import { useLocale, useTranslations } from 'next-intl';

import { LockedPreview } from '@/components/vendors/me/LockedPreview';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import { formatReachCount, type ReachTile } from '@/lib/vendorReach';

// The vendor's reach in this event. Every number has one tile and is not restated anywhere else on the page.
// A non-partner sees their tiles, then the partner tiles as a blurred sample.
export function ReachSection({
    tiles,
    sampleTiles,
    partner,
    canApply,
    isLoading,
    loadFailed,
    onBecomePartnerAction,
}: {
    tiles: ReachTile[];
    sampleTiles: ReachTile[];
    partner: boolean;
    canApply: boolean;
    isLoading: boolean;
    loadFailed: boolean;
    onBecomePartnerAction: () => void;
}) {
    const t = useTranslations('Vendors.reach');
    const tHints = useTranslations('Vendors.hints');

    return (
        <VendorMeSection id="vendor-reach-title" title={t('title')} hint={tHints('reach')} busy={isLoading}>
            {/* Tiles */}
            {loadFailed ? (
                <p className="text-sm text-ink-muted">{t('loadFailed')}</p>
            ) : isLoading ? (
                <div className="grid grid-cols-2 gap-2">
                    <div className="h-16 animate-pulse rounded-lg bg-surface-muted" />
                    <div className="h-16 animate-pulse rounded-lg bg-surface-muted" />
                </div>
            ) : (
                <ReachTiles tiles={tiles} />
            )}

            {/* Partner numbers */}
            {!partner && !loadFailed && !isLoading && (
                <LockedPreview label={t('lockedLabel')} canApply={canApply} onApplyAction={onBecomePartnerAction}>
                    <ReachTiles tiles={sampleTiles} />
                </LockedPreview>
            )}
        </VendorMeSection>
    );
}

function ReachTiles({ tiles }: { tiles: ReachTile[] }) {
    const t = useTranslations('Vendors.reach');
    const locale = useLocale();

    return (
        <dl className="grid grid-cols-2 gap-2">
            {tiles.map((tile) => (
                <div key={tile.key} className="rounded-lg bg-surface-muted px-3.5 py-3">
                    <dt className="text-xs leading-snug text-ink-muted">{t(`tiles.${tile.key}`)}</dt>
                    <dd className="mt-1 text-xl font-bold text-ink tabular-nums">{formatReachCount(locale, tile.value)}</dd>
                </div>
            ))}
        </dl>
    );
}
