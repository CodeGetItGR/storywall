'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { PhotographerSwitch } from '@/components/gallery/print/PhotographerSwitch';
import { PrintRow } from '@/components/gallery/print/PrintRow';
import { PrintTotalRows } from '@/components/gallery/print/PrintTotalRows';
import { Modal } from '@/components/ui/modal';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import type { PrintItemPatch, PrintListItemDto, PrintPhotographerDto } from '@/lib/api/types';
import type { PrintTotals } from '@/lib/printPicks';

// The list being built for one photographer. footer: the guest's Send and sent lists (Part B).
export function PrintSheet({
    open,
    photographers,
    photographer,
    items,
    totals,
    error,
    isLoading = false,
    loadFailed = false,
    readOnly,
    footer,
    onSelectPhotographerAction,
    onUpdateItemAction,
    onRemoveItemAction,
    onCloseAction,
}: {
    open: boolean;
    photographers: PrintPhotographerDto[];
    photographer: PrintPhotographerDto | null;
    items: PrintListItemDto[];
    totals: PrintTotals;
    error: string | null;
    // The list is being read, or could not be: neither is "no photos picked yet".
    isLoading?: boolean;
    loadFailed?: boolean;
    readOnly?: boolean;
    footer?: ReactNode;
    onSelectPhotographerAction: (vendorId: string) => void;
    onUpdateItemAction: (itemId: string, patch: PrintItemPatch) => void;
    onRemoveItemAction: (itemId: string) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('GalleryPage.print');

    return (
        <Modal open={open} onClose={onCloseAction} variant="sheet" size="sm" ariaLabel={t('sheetTitle')} closeLabel={t('close')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                {/* Header */}
                <h2 className="pr-8 text-base font-bold text-ink">{t('sheetTitle')}</h2>

                {/* Photographer: the switch (two or more), then who sees this list */}
                {photographer && (
                    <div className="mt-3 flex flex-col gap-2">
                        <PhotographerSwitch
                            photographers={photographers}
                            activeId={photographer.vendorId}
                            onSelectAction={onSelectPhotographerAction}
                        />
                        <p className="text-sm text-ink-muted">{t('seenBy', { name: photographer.businessName ?? t('photographerUnnamed') })}</p>
                    </div>
                )}

                {/* Picks */}
                {loadFailed ? null : isLoading ? (
                    <div className="mt-3">
                        <VendorRowsSkeleton rows={2} />
                    </div>
                ) : items.length === 0 ? (
                    <p className="mt-4 text-sm text-ink-muted">{t('empty')}</p>
                ) : (
                    <ul className="mt-3 divide-y divide-border">
                        {items.map((item) => (
                            <PrintRow
                                key={item.id}
                                item={item}
                                sizes={photographer?.sizes ?? []}
                                disabled={readOnly}
                                onUpdateAction={onUpdateItemAction}
                                onRemoveAction={onRemoveItemAction}
                            />
                        ))}
                    </ul>
                )}
            </Modal.Body>

            {/* Total, error and footer: pinned under the list */}
            {(totals.prints > 0 || error || footer) && (
                <div className="flex flex-col gap-3 border-t border-border px-5 pt-3 pb-5">
                    {totals.prints > 0 && <PrintTotalRows totals={totals} />}
                    {error && (
                        <p role="alert" className="text-sm text-rose-600">
                            {error}
                        </p>
                    )}
                    {footer}
                </div>
            )}
        </Modal>
    );
}
