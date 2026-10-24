'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { usePrintsIncludedForm } from '@/hooks/usePrintsIncludedForm';
import { PRINTS_INCLUDED_MAX } from '@/lib/printPicks';

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
    const form = usePrintsIncludedForm({ initial, onSave: onSaveAction });
    const errorId = useId();

    return (
        <Modal open={open} onClose={onCloseAction} variant="sheet" size="sm" ariaLabel={t('includedSheetTitle')} closeLabel={t('cancel')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                <form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
                    {/* Header */}
                    <h2 className="pr-8 text-base font-bold text-ink">{t('includedSheetTitle')}</h2>

                    {/* Count */}
                    <div className="flex flex-col gap-1">
                        <label className="flex flex-col gap-1 text-sm text-ink">
                            {t('includedLabel')}
                            <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={PRINTS_INCLUDED_MAX}
                                step={1}
                                value={form.value}
                                onChange={form.handleChange}
                                aria-invalid={form.error ? true : undefined}
                                aria-describedby={form.error ? errorId : undefined}
                                className="min-h-11 rounded-lg border border-border bg-background px-3 font-mono"
                            />
                        </label>
                        {form.error && (
                            <p id={errorId} role="alert" className="text-xs text-rose-600">
                                {form.error}
                            </p>
                        )}
                    </div>
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
                        <Button type="submit" size="lg" disabled={isSaving}>
                            {t('save')}
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
