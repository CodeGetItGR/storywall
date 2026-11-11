'use client';

import { useTranslations } from 'next-intl';

import { EventDetailsStep } from '@/components/event/create/EventDetailsStep';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { DetailsPreview } from '@/components/event/create/wizard/details/DetailsPreview';
import { DetailsTimeZone } from '@/components/event/create/wizard/details/DetailsTimeZone';
import { useCreateEventWizardDetails } from '@/hooks/useCreateEventWizardDetails';

export function DetailsStep() {
    const t = useTranslations('CreateEventPage.wizard.details');
    const { preview, timeZone } = useCreateEventWizardDetails();

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
            />
        </div>
    );
}
