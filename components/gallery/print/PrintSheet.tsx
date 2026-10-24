'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { PhotographerSwitch } from '@/components/gallery/print/PhotographerSwitch';
import { PrintRow } from '@/components/gallery/print/PrintRow';
import { PrintTotal } from '@/components/gallery/print/PrintTotal';
import { Modal } from '@/components/ui/modal';
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
    readOnly?: boolean;
    footer?: ReactNode;
    onSelectPhotographerAction: (vendorId: string) => void;
    onUpdateItemAction: (itemId: string, patch: PrintItemPatch) => void;
    onRemoveItemAction: (itemId: string) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('GalleryPage.print');

    return (
        <Modal open={open} onClose={onCloseAction} variant="sheet" size="sm" closeLabel={t('close')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                {/* Header */}
                <h2 className="pr-8 text-base font-bold text-ink">{t('sheetTitle')}</h2>
                {photographer && photographers.length < 2 && (
                    <p className="text-sm text-ink-muted">{t('for', { name: photographer.businessName ?? t('photographerUnnamed') })}</p>
                )}

                {/* Photographer */}
                {photographer && (
                    <div className="mt-3">
                        <PhotographerSwitch photographers={photographers} activeId={photographer.vendorId} onSelectAction={onSelectPhotographerAction} />
                    </div>
                )}

                {/* Picks */}
                {items.length === 0 ? (
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

                {/* Total */}
                {totals.prints > 0 && (
                    <div className="mt-4">
                        <PrintTotal totals={totals} />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <p role="alert" className="mt-3 text-sm text-rose-600">
                        {error}
                    </p>
                )}

                {/* Footer */}
                {footer}
            </Modal.Body>
        </Modal>
    );
}
