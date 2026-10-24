'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { VendorServiceItemDto } from '@/lib/api/types';
import { centsToEuroInput, euroInputToCents } from '@/lib/printPicks';

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
    const editing = item === 'new' ? null : item;
    const title = editing ? t('sheetEdit') : t('sheetAdd');
    const [label, setLabel] = useState(editing?.label ?? '');
    const [price, setPrice] = useState(editing ? centsToEuroInput(editing.priceCents) : '');
    const [touched, setTouched] = useState(false);
    const cents = euroInputToCents(price);
    const labelOk = label.trim().length > 0 && label.trim().length <= 40;

    function handleLabel(event: ChangeEvent<HTMLInputElement>) {
        setLabel(event.currentTarget.value);
    }

    function handlePrice(event: ChangeEvent<HTMLInputElement>) {
        setPrice(event.currentTarget.value);
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setTouched(true);
        if (labelOk && cents !== null) onSaveAction(label.trim(), cents);
    }

    return (
        <Modal open onClose={onCloseAction} variant="sheet" size="sm" ariaLabel={title} closeLabel={t('cancel')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                    {/* Header */}
                    <h2 className="pr-8 text-base font-bold text-ink">{title}</h2>

                    {/* Size */}
                    <label className="flex flex-col gap-1 text-sm text-ink">
                        {t('label')}
                        <input
                            value={label}
                            onChange={handleLabel}
                            maxLength={40}
                            placeholder={t('labelPlaceholder')}
                            className="min-h-11 rounded-lg border border-border bg-background px-3"
                        />
                        {touched && !labelOk && (
                            <span role="alert" className="text-xs text-rose-600">
                                {t('labelRequired')}
                            </span>
                        )}
                    </label>

                    {/* Price */}
                    <label className="flex flex-col gap-1 text-sm text-ink">
                        {t('price')}
                        <input
                            value={price}
                            onChange={handlePrice}
                            inputMode="decimal"
                            className="min-h-11 rounded-lg border border-border bg-background px-3 font-mono"
                        />
                        {touched && cents === null && (
                            <span role="alert" className="text-xs text-rose-600">
                                {t('priceInvalid')}
                            </span>
                        )}
                    </label>

                    {error && (
                        <p role="alert" className="text-sm text-rose-600">
                            {error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {editing ? (
                            <Button type="button" variant="ghost" size="lg" onClick={onDeleteAction} className="text-destructive">
                                <Trash2 aria-hidden="true" />
                                {t('delete')}
                            </Button>
                        ) : (
                            <span />
                        )}
                        <Button type="submit" size="lg" disabled={isSaving}>
                            {t('save')}
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
