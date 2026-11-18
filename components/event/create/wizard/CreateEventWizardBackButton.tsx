'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useCreateEventWizardBack } from '@/hooks/useCreateEventWizardBack';

// Top-left from the plan step on: back one step, or from sign-up or sign-in back to the account choices.
export function CreateEventWizardBackButton() {
    const t = useTranslations('CreateEventPage.actions');
    const onBack = useCreateEventWizardBack();
    return (
        <button
            type="button"
            aria-label={t('back')}
            onClick={onBack}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#fbf1e6] text-ink focus-ring"
        >
            <ArrowLeft className="size-4.5" aria-hidden="true" />
        </button>
    );
}
