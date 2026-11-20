'use client';

import { useTranslations } from 'next-intl';

import { EventDetailsStep } from '@/components/event/create/EventDetailsStep';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { DetailsPreview } from '@/components/event/create/wizard/details/DetailsPreview';
import { DetailsTimeZone } from '@/components/event/create/wizard/details/DetailsTimeZone';
import { LiteDetailsStep } from '@/components/event/create/wizard/details/LiteDetailsStep';
import { useCreateEventWizardDetails } from '@/hooks/useCreateEventWizardDetails';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// A lite plan asks only for the title: its own step.
export function DetailsStep() {
    const { asksDetails } = useCreateEventForm();
    return asksDetails ? <FullDetailsStep /> : <LiteDetailsStep />;
}

function FullDetailsStep() {
    const t = useTranslations('CreateEventPage.wizard.details');
    const { preview, showReceptionNote, timeZone } = useCreateEventWizardDetails();

    return (
        <div className="flex flex-col gap-5">
            {/* Preview */}
            <DetailsPreview {...preview} />

            {/* Heading */}
            <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[26px] leading-[1.15] tracking-[-0.02em] text-ink">
                {t('heading')}
            </h1>

            {/* Fields */}
            <EventDetailsStep
                showScheduleHint={false}
                addressPlaceholder={t('addressPlaceholder')}
                timezoneField={<DetailsTimeZone {...timeZone} />}
                locationNote={showReceptionNote && <p className="-mt-2 text-[13px] text-[#6f6257]">{t('receptionLater')}</p>}
            />
        </div>
    );
}
