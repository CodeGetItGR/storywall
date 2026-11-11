'use client';

import { useTranslations } from 'next-intl';

import type { EventTypeConvention } from '@/lib/api/types';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// Copy rows 17-21: the type step's button names the type; any other type gets "your event".
const TYPE_CONTINUE_KEY: Partial<Record<EventTypeConvention, string>> = {
    WEDDING: 'wedding',
    BAPTISM: 'baptism',
    GENDER_REVEAL: 'reveal',
    REUNION: 'reunion',
};

// The wizard's one full-width button on the type and plan steps; null on later steps (old footer).
export function useCreateEventWizardFooter(): { label: string; disabled: boolean; onClick: () => void } | null {
    const t = useTranslations('CreateEventPage.wizard');
    const form = useCreateEventForm();

    if (form.step === 'type') {
        const key = TYPE_CONTINUE_KEY[form.selectedEventType] ?? 'other';
        return { label: t(`type.continue.${key}`), disabled: !form.canContinueType, onClick: form.goToPlan };
    }
    if (form.step === 'plan') {
        return { label: t('plan.continue'), disabled: !form.canContinuePlan, onClick: form.goToDetails };
    }
    return null;
}
