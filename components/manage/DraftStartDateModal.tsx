'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { Modal } from '@/components/ui/modal';
import { useCreateEventFieldLabels } from '@/hooks/useCreateEventFieldLabels';
import type { DraftStartDate } from '@/hooks/useDraftStartDate';
import type { EventTypeConvention } from '@/lib/api/types';

const inputClass =
    'w-full rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink outline-none transition focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60';

// Moves a draft's start date (its end moves with it).
export function DraftStartDateModal({ date, eventType }: { date: DraftStartDate; eventType: EventTypeConvention }) {
    const t = useTranslations('ManagePage.draft.startDate');
    const labels = useCreateEventFieldLabels(eventType);

    return (
        <Modal open={date.isOpen} onClose={date.close} size="sm" closeLabel={t('cancel')}>
            <Modal.Body className="px-4 pt-12 pb-4 sm:px-5">
                <form className="flex flex-col gap-5" onSubmit={date.handleSubmit}>
                    {/* Header */}
                    <h2 className="pr-8 text-base font-semibold text-ink">{t('title')}</h2>

                    {/* Date */}
                    <FormFieldLabel label={labels.startAt} required>
                        <input
                            type="datetime-local"
                            value={date.value}
                            min={date.min}
                            max={date.max}
                            onChange={date.handleChange}
                            disabled={date.isSaving}
                            aria-invalid={Boolean(date.validationError)}
                            className={inputClass}
                        />
                        {date.validationError && <span className="text-xs text-rose-600">{date.validationError}</span>}
                    </FormFieldLabel>
                    {date.error && <p className="text-sm text-rose-600">{date.error}</p>}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={date.close}
                            disabled={date.isSaving}
                            className="rounded-full bg-surface-muted px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={date.isSaving || !date.canSave}
                            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {date.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {t('save')}
                        </button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
