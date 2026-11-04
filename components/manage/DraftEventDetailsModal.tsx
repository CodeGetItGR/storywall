'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EventScheduleVenueFields } from '@/components/event/create/EventScheduleVenueFields';
import { Modal } from '@/components/ui/modal';
import type { DraftEventDetails } from '@/hooks/useDraftEventDetails';
import type { EventTypeConvention } from '@/lib/api/types';

// Gives a draft without a date its date and place, so it can be paid for.
export function DraftEventDetailsModal({ details, eventType }: { details: DraftEventDetails; eventType: EventTypeConvention }) {
    const t = useTranslations('ManagePage.draft.startDate');
    const tCreate = useTranslations('CreateEventPage');

    return (
        <Modal open={details.isOpen} onClose={details.close} closeLabel={t('cancel')}>
            <Modal.Body className="px-4 pt-12 pb-4 sm:px-5">
                <form className="flex flex-col gap-4" onSubmit={details.handleSubmit}>
                    {/* Header */}
                    <h2 className="pr-8 text-base font-semibold text-ink">{tCreate('whenAndWhere')}</h2>

                    {/* Details */}
                    <EventScheduleVenueFields eventType={eventType} {...details.form} />
                    {details.error && <p className="text-sm text-rose-600">{details.error}</p>}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={details.close}
                            disabled={details.isSaving}
                            className="rounded-full bg-surface-muted px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={details.isSaving || !details.form.isComplete}
                            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {details.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {t('save')}
                        </button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
