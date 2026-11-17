'use client';

import { useTranslations } from 'next-intl';

import { Skeleton } from '@/components/ui/skeleton';
import type { RsvpReportTotalsDto } from '@/lib/api/types';

type RsvpHeadlineTilesProps = { totals: RsvpReportTotalsDto | null; isLoading: boolean };

// R1a: four soft tiles in one row, phones included. The report page keeps RsvpReportTiles.
export function RsvpHeadlineTiles({ totals, isLoading }: RsvpHeadlineTilesProps) {
    const t = useTranslations('ManagePage.rsvpStats');

    if (isLoading) {
        return (
            <div aria-hidden="true" className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-[58px] rounded-2xl" />
                ))}
            </div>
        );
    }
    if (!totals) return null;

    const tiles = [
        { key: 'responses', label: t('responses'), value: totals.responses },
        { key: 'people', label: t('totalPeople'), value: totals.people },
        { key: 'adults', label: t('adults'), value: totals.adults },
        { key: 'kids', label: t('kids'), value: totals.children },
    ];

    return (
        <dl className="grid grid-cols-4 gap-2">
            {tiles.map((tile) => (
                // Tile: the label comes first in the markup (valid dl), the number shows on top.
                <div key={tile.key} className="flex min-w-0 flex-col-reverse gap-px rounded-2xl bg-surface-muted px-2 py-2.5 sm:px-3">
                    <dt className="truncate text-[11px] font-semibold text-ink-muted">{tile.label}</dt>
                    <dd className="text-[19px] leading-tight font-bold text-ink tabular-nums">{tile.value}</dd>
                </div>
            ))}
        </dl>
    );
}
