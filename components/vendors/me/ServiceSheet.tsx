'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useServiceSizeForm } from '@/hooks/useServiceSizeForm';
import type { VendorServiceItemDto } from '@/lib/api/types';
import { PRINT_SIZE_LABEL_MAX } from '@/lib/printPicks';

// Add or edit one print size. Delete lives here, behind the screen's confirmation modal.
export function ServiceSheet({
    item,
    isSaving,
    error,
    onSaveAction,
    onDeleteAction,
    onCloseAction,
}: {
    item: VendorServiceItemDto | 'new';
    isSaving: boolean;
    error: string | null;
    onSaveAction: (label: string, priceCents: number) => void;
    onDeleteAction: () => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('Vendors.services');
    const form = useServiceSizeForm({ item, onSave: onSaveAction });
    const title = form.isEditing ? t('sheetEdit') : t('sheetAdd');
    const labelErrorId = useId();
    const priceErrorId = useId();

    return (
        <Modal open onClose={onCloseAction} variant="sheet" size="sm" ariaLabel={title} closeLabel={t('cancel')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                <form onSubmit={form.handleSubmit} className="flex flex-col gap-4" noValidate>
                    {/* Header */}
                    <h2 className="pr-8 text-base font-bold text-ink">{title}</h2>

                    {/* Size */}
                    <div className="flex flex-col gap-1">
                        <label className="flex flex-col gap-1 text-sm text-ink">
                            {t('label')}
                            <input
                                value={form.label}
                                onChange={form.handleLabel}
                                maxLength={PRINT_SIZE_LABEL_MAX}
                                placeholder={t('labelPlaceholder')}
                                aria-invalid={form.labelError ? true : undefined}
                                aria-describedby={form.labelError ? labelErrorId : undefined}
                                className="min-h-11 rounded-lg border border-border bg-background px-3"
                            />
                        </label>
                        {form.labelError && (
                            <p id={labelErrorId} role="alert" className="text-xs text-rose-600">
                                {form.labelError}
                            </p>
                        )}
                    </div>

                    {/* Price */}
                    <div className="flex flex-col gap-1">
                        <label className="flex flex-col gap-1 text-sm text-ink">
                            {t('price')}
                            <input
                                value={form.price}
                                onChange={form.handlePrice}
                                inputMode="decimal"
                                aria-invalid={form.priceError ? true : undefined}
                                aria-describedby={form.priceError ? priceErrorId : undefined}
                                className="min-h-11 rounded-lg border border-border bg-background px-3 tabular-nums"
                            />
                        </label>
                        {form.priceError && (
                            <p id={priceErrorId} role="alert" className="text-xs text-rose-600">
                                {form.priceError}
                            </p>
                        )}
                    </div>

                    {error && (
                        <p role="alert" className="text-sm text-rose-600">
                            {error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {form.isEditing ? (
                            <Button type="button" variant="ghost" size="lg" onClick={onDeleteAction} className="text-destructive">
                                <Trash2 aria-hidden="true" />
                                {t('delete')}
                            </Button>
                        ) : (
                            <span />
                        )}
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="lg" onClick={onCloseAction}>
                                {t('cancel')}
                            </Button>
                            <Button type="submit" size="lg" disabled={isSaving}>
                                {t('save')}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
