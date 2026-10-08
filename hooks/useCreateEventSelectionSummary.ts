'use client';

import { useTranslations } from 'next-intl';

import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

export type CreateEventSelectionSummary = { label: string; editLabel: string; onEdit: () => void };

// What the earlier steps picked, for the steps where it is out of sight: the event type on the
// plan step, the type and plan on details and theme. Null on the type step, and on the overview,
// which shows both itself.
export function useCreateEventSelectionSummary(): CreateEventSelectionSummary | null {
    const t = useTranslations('CreateEventPage.selection');
    const { step, selectedEventType, selectedPlan, goToType, goToPlan } = useCreateEventForm();
    const eventTypeName = useLocalizedAppEventTypeCopy()(selectedEventType).name;

    if (step === 'plan') return { label: eventTypeName, editLabel: t('changeType'), onEdit: goToType };
    if ((step === 'details' || step === 'theme') && selectedPlan) {
        return { label: `${eventTypeName} · ${selectedPlan.name}`, editLabel: t('changePlan'), onEdit: goToPlan };
    }
    return null;
}
