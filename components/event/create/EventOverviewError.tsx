'use client';

import { useTranslations } from 'next-intl';

import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

/** Submit error for the overview step, shown in the sticky footer so it is never scrolled out of view. */
export function EventOverviewError() {
    const t = useTranslations('CreateEventPage');
    const { error, startPassed, goToDetails, hasDraft } = useCreateEventForm();

    if (!error) return null;

    return (
        <div role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-center text-xs text-rose-600">
            <p>{error}</p>
            {startPassed ? (
                <button type="button" onClick={goToDetails} className="mt-1 font-semibold underline underline-offset-2">
                    {t('changeDate')}
                </button>
            ) : (
                hasDraft && <p className="mt-1 font-semibold">{t('paidModules.openSetup')}</p>
            )}
        </div>
    );
}
