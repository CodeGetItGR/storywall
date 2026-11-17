'use client';

import { useTranslations } from 'next-intl';

import { Skeleton } from '@/components/ui/skeleton';
import type { RsvpReportTotalsDto } from '@/lib/api/types';

type RsvpHeadlineTilesProps = { totals: RsvpReportTotalsDto | null; isLoading: boolean };

// R1a: the four numbers side by side in one soft panel, like the Members tiles. The report page keeps RsvpReportTiles.
export function RsvpHeadlineTiles({ totals, isLoading }: RsvpHeadlineTilesProps) {
    const t = useTranslations('ManagePage.rsvpStats');

    if (isLoading) return <Skeleton aria-hidden="true" className="h-[70px] rounded-[20px]" />;
    if (!totals) return null;

    const tiles = [
        { key: 'responses', label: t('responses'), value: totals.responses },
        { key: 'people', label: t('totalPeople'), value: totals.people },
        { key: 'adults', label: t('adults'), value: totals.adults },
        { key: 'kids', label: t('kids'), value: totals.children },
    ];

    return (
        <dl className="grid grid-cols-[repeat(4,auto)] justify-between gap-3 rounded-[20px] bg-surface-muted px-4 py-3.5 sm:px-5 sm:py-4">
            {tiles.map((tile) => (
                // Column: label, then the number. Columns fit their label, so words never split.
                <div key={tile.key} className="flex flex-col gap-1">
                    <dt className="text-xs leading-tight font-semibold text-ink-muted">{tile.label}</dt>
                    <dd className="mt-auto text-lg leading-tight font-bold text-ink tabular-nums">{tile.value}</dd>
                </div>
            ))}
        </dl>
    );
}
