'use client';

import { Download, Pencil } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { PrintTotal } from '@/components/gallery/print/PrintTotal';
import { Button } from '@/components/ui/button';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';
import { PrintListReadRow } from '@/components/vendors/me/PrintListReadRow';
import { PrintPartButton } from '@/components/vendors/me/PrintPartButton';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import type { PrintListItemDto } from '@/lib/api/types';
import type { PrintTotals } from '@/lib/printPicks';

// The photographer's Prints section: what the package includes, the host's picks, the total and the download.
export function PrintsSection({
    included,
    items,
    removedCount,
    totals,
    partCount,
    downloadingPart,
    isLoadingParts,
    isLoading,
    isLoadingIncluded,
    listFailed,
    includedFailed,
    error,
    onEditIncludedAction,
    onDownloadPartAction,
}: {
    included: number;
    items: PrintListItemDto[];
    removedCount: number;
    totals: PrintTotals;
    partCount: number;
    downloadingPart: number | null;
    isLoadingParts: boolean;
    isLoading: boolean;
    isLoadingIncluded: boolean;
    listFailed: boolean;
    includedFailed: boolean;
    error: string | null;
    onEditIncludedAction: () => void;
    onDownloadPartAction: (part: number) => void;
}) {
    const t = useTranslations('Vendors.prints');
    const format = useFormatter();
    const live = items.filter((item) => !item.removed);
    const parts = Array.from({ length: partCount }, (_, index) => index + 1);

    return (
        <section aria-labelledby="vendor-prints-title" className="flex flex-col gap-4">
            {/* Header */}
            <h2 id="vendor-prints-title" className="text-sm font-semibold text-ink">
                {t('title')}
            </h2>

            {/* Included: the one place the package size shows */}
            {!includedFailed && (
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-ink-muted">{t('included')}</p>
                    {isLoadingIncluded ? (
                        <SkeletonStatus>
                            <Skeleton className="h-11 w-20 rounded-lg" />
                        </SkeletonStatus>
                    ) : (
                        <Button type="button" variant="outline" size="lg" aria-label={t('includedEditLabel')} onClick={onEditIncludedAction}>
                            <span className="tabular-nums">{format.number(included)}</span>
                            <Pencil aria-hidden="true" />
                        </Button>
                    )}
                </div>
            )}

            {/* Host picks */}
            {listFailed ? null : isLoading ? (
                <VendorRowsSkeleton rows={3} />
            ) : live.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('hostEmpty')}</p>
            ) : (
                <ul className="divide-y divide-border">
                    {live.map((item) => (
                        <PrintListReadRow key={item.id} item={item} />
                    ))}
                </ul>
            )}
            {!listFailed && removedCount > 0 && <p className="text-xs text-ink-muted">{t('removedCount', { count: removedCount })}</p>}

            {/* Total and download */}
            {!listFailed && totals.prints > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {!includedFailed && <PrintTotal totals={totals} withIncluded={false} noPriceLabel={t('noPrice')} />}
                    <div className="flex flex-wrap gap-2">
                        {isLoadingParts && (
                            <Button type="button" size="lg" disabled>
                                <Download aria-hidden="true" />
                                {t('download')}
                            </Button>
                        )}
                        {parts.map((part) => (
                            <PrintPartButton
                                key={part}
                                part={part}
                                partCount={partCount}
                                isDownloading={downloadingPart === part}
                                disabled={downloadingPart !== null}
                                onDownloadAction={onDownloadPartAction}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <p role="alert" className="text-sm text-rose-600">
                    {error}
                </p>
            )}
        </section>
    );
}
