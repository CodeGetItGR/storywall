'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

// Sets how many prints the photographer's package includes for the host. Mount it keyed on `open`
// so each opening starts from the saved value.
export function PrintsIncludedSheet({
    open,
    initial,
    isSaving,
    error,
    onSaveAction,
    onCloseAction,
}: {
    open: boolean;
    initial: number;
    isSaving: boolean;
    error: string | null;
    onSaveAction: (count: number) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('Vendors.prints');
    const [value, setValue] = useState(String(initial));
    const valid = /^\d{1,4}$/.test(value.trim());

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        setValue(event.currentTarget.value);
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (valid) onSaveAction(Number(value));
    }

    return (
        <Modal open={open} onClose={onCloseAction} variant="sheet" size="sm" ariaLabel={t('includedSheetTitle')} closeLabel={t('cancel')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Header */}
                    <h2 className="pr-8 text-base font-bold text-ink">{t('includedSheetTitle')}</h2>

                    {/* Count */}
                    <label className="flex flex-col gap-1 text-sm text-ink">
                        {t('includedLabel')}
                        <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={9999}
                            step={1}
                            value={value}
                            onChange={handleChange}
                            className="min-h-11 rounded-lg border border-border bg-background px-3 font-mono"
                        />
                    </label>
                    {error && (
                        <p role="alert" className="text-sm text-rose-600">
                            {error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="lg" onClick={onCloseAction}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" size="lg" disabled={!valid || isSaving}>
                            {t('save')}
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
