'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

// How many prints the host's package includes, as a price-list row. The whole row opens the edit sheet.
export function PrintsIncludedRow({ included, isLoading, onEditAction }: { included: number; isLoading: boolean; onEditAction: () => void }) {
    const t = useTranslations('Vendors.prints');
    const format = useFormatter();

    return (
        <li>
            {isLoading ? (
                <SkeletonStatus>
                    <Skeleton className="my-3 h-6 w-full rounded-lg" />
                </SkeletonStatus>
            ) : (
                <button
                    type="button"
                    onClick={onEditAction}
                    className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left text-sm"
                >
                    <span className="text-ink">{t('included')}</span>
                    <span className="text-ink-muted tabular-nums">{format.number(included)}</span>
                </button>
            )}
        </li>
    );
}
