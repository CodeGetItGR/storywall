'use client';

import { Calendar } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

export function ActivationEventSummary({
    eventTitle,
    eventTypeName,
    startAt,
}: {
    eventTitle: string;
    eventTypeName: string;
    startAt: string | null;
}) {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

    return (
        <section aria-labelledby="activation-event-heading" className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
            <div className="min-w-0">
                <h3 id="activation-event-heading" className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
                    {t('overview.event')}
                </h3>
                <p className="mt-1 font-semibold text-ink">{eventTitle}</p>
                <p className="mt-0.5 text-sm text-ink-muted">
                    {eventTypeName}
                    {startAt && ` · ${dateFormatter.format(new Date(startAt))}`}
                </p>
            </div>
        </section>
    );
}
