'use client';

import { CalendarClock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { useCreateEventFieldLabels } from '@/hooks/useCreateEventFieldLabels';
import type { EventDetailsForm } from '@/hooks/useEventDetailsForm';
import type { EventTypeConvention } from '@/lib/api/types';
import { dateTimeFormat } from '@/lib/format';

// The date and place on the upgrade's review, with the way back to change them.
export function UpgradeEventDetailsSummary({
    form,
    eventType,
    onEditAction,
}: {
    form: EventDetailsForm;
    eventType: EventTypeConvention;
    onEditAction: () => void;
}) {
    const t = useTranslations('ManagePage.draft.startDate');
    const locale = useLocale();
    const labels = useCreateEventFieldLabels(eventType);
    const date = form.request ? dateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(form.request.startAt)) : '';

    return (
        <>
            <div>
                <dt className="text-xs font-semibold text-ink-muted">{labels.startAt}</dt>
                <dd className="mt-1 font-semibold text-ink">{date}</dd>
                <button
                    type="button"
                    onClick={onEditAction}
                    className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-primary-dark underline underline-offset-2"
                >
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('action')}
                </button>
            </div>
            <div>
                <dt className="text-xs font-semibold text-ink-muted">{labels.locationName}</dt>
                <dd className="mt-1 font-semibold text-ink">{form.locationName.trim()}</dd>
                <dd className="mt-0.5 text-ink-muted">{form.locationAddress.trim()}</dd>
            </div>
        </>
    );
}
