'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// Top-left from the plan step on: back one step (one history entry when the wizard pushed it).
export function CreateEventWizardBackButton() {
    const t = useTranslations('CreateEventPage.actions');
    const { goBack } = useCreateEventForm();
    return (
        <button
            type="button"
            aria-label={t('back')}
            onClick={goBack}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#fbf1e6] text-ink focus-ring"
        >
            <ArrowLeft className="size-4.5" aria-hidden="true" />
        </button>
    );
}
