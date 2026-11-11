'use client';

import { useTranslations } from 'next-intl';

import { EventThemeStep } from '@/components/event/create/EventThemeStep';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';

export function ThemeStep() {
    const t = useTranslations('CreateEventPage.wizard.theme');

    return (
        <div className="flex flex-col gap-2">
            {/* Heading */}
            <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[28px] leading-[1.15] tracking-[-0.02em] text-ink">
                {t('heading')}
            </h1>
            <p className="text-[15px] text-[#6f6257]">{t('line')}</p>

            {/* Themes */}
            <EventThemeStep showHint={false} />
        </div>
    );
}
