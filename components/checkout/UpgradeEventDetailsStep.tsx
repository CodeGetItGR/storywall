'use client';

import { useTranslations } from 'next-intl';
import type { SubmitEvent } from 'react';

import { EventScheduleVenueFields } from '@/components/event/create/EventScheduleVenueFields';
import { BackButton } from '@/components/ui/BackButton';
import type { EventDetailsForm } from '@/hooks/useEventDetailsForm';
import type { EventTypeConvention } from '@/lib/api/types';

// The upgrade's first step when the new plan needs a date and place and the event has none.
export function UpgradeEventDetailsStep({
    form,
    eventType,
    backHref,
    backLabel,
    onSubmitAction,
}: {
    form: EventDetailsForm;
    eventType: EventTypeConvention;
    backHref: string;
    backLabel: string;
    onSubmitAction: (event: SubmitEvent<HTMLFormElement>) => void;
}) {
    const t = useTranslations('CreateEventPage');

    return (
        <main className="mx-auto max-w-3xl px-4 pt-6 pb-28 sm:pt-10 sm:pb-12">
            <BackButton href={backHref} label={backLabel} />

            {/* Header */}
            <h1 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">{t('whenAndWhere')}</h1>

            {/* Details */}
            <form className="mt-6 space-y-4" onSubmit={onSubmitAction}>
                <EventScheduleVenueFields eventType={eventType} {...form} />

                {/* Action */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={!form.isComplete}
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                    >
                        {t('continueToOverview')}
                    </button>
                </div>
            </form>
        </main>
    );
}
