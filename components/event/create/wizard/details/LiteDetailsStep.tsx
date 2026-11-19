'use client';

import { useTranslations } from 'next-intl';

import { EventGiftFields } from '@/components/event/create/EventGiftFields';
import { EventTitleField } from '@/components/event/create/EventTitleField';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { LitePlanArt } from '@/components/event/create/wizard/details/LitePlanArt';
import { useLiteDetailsStep } from '@/hooks/useLiteDetailsStep';

// A lite plan's details: the plan as guests meet it, then only the title and the gift option.
export function LiteDetailsStep() {
    const t = useTranslations('CreateEventPage.wizard.details');
    const { art } = useLiteDetailsStep();

    return (
        <div className="flex flex-col gap-5">
            {/* Plan picture */}
            {art && <LitePlanArt kind={art.kind} eventType={art.eventType} title={art.title} alt={art.alt} />}

            {/* Heading */}
            <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[26px] leading-[1.15] tracking-[-0.02em] text-ink">
                {t('heading')}
            </h1>

            {/* Title */}
            <div className="w-full">
                <EventTitleField />
            </div>

            {/* Gift */}
            <EventGiftFields />
        </div>
    );
}
