'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { type MarketingPlanOption, useMarketingPlanOptions } from '@/hooks/useMarketingPlanOptions';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useRadioGroupKeys } from '@/hooks/useRadioGroupKeys';
import type { CreateEventFeatureKey } from '@/lib/createEventFeatures';
import { guestChips, planHighlights } from '@/lib/createEventPlanChoice';
import { pickedLandingDuration } from '@/lib/landingPricing';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

export type PlanChipView = { planCode: string; label: string; selected: boolean };
export type PlanCardView = {
    code: string;
    name: string;
    summary: string;
    price: string;
    listPrice: string | null;
    isFull: boolean;
    previousName: string | null;
    highlights: { key: CreateEventFeatureKey; name: string }[];
    durations: { id: string; months: number }[];
    durationId: string;
};

// The plan step as plain values: guest chips, the card of the selected plan, and its durations.
export function useCreateEventWizardPlanStep() {
    const t = useTranslations('CreateEventPage.wizard.plan');
    const { eventPlans, modules, media, selectedCode, durationPicks, onSelectPlan, onSelectPlanDuration, isPlansLoading, selectedEventType } =
        useCreateEventForm();
    const { full, lite } = useMarketingPlanOptions({ plans: eventPlans, modules, media });
    const moduleCopy = useModuleCopy(selectedEventType);

    const chips: PlanChipView[] = useMemo(
        () =>
            guestChips(full.map((option) => option.config)).map((chip) => ({
                planCode: chip.planCode,
                label: t(chip.kind, { count: chip.count }),
                selected: chip.planCode === selectedCode,
            })),
        [full, selectedCode, t],
    );

    const card: PlanCardView | null = useMemo(() => {
        const fullIndex = full.findIndex((option) => option.config.code === selectedCode);
        const option: MarketingPlanOption | undefined = fullIndex >= 0 ? full[fullIndex] : lite.find((entry) => entry.config.code === selectedCode);
        if (!option) return null;
        const previous = fullIndex > 0 ? full[fullIndex - 1].config : undefined;
        const duration = pickedLandingDuration(option.presentation, durationPicks[option.config.code]);
        return {
            code: option.config.code,
            name: option.presentation.name,
            summary: `${option.presentation.audience} · ${option.presentation.storage}`,
            price: duration.price,
            listPrice: duration.listPrice,
            isFull: fullIndex >= 0,
            previousName: previous?.name ?? null,
            highlights: planHighlights(option.config, previous, selectedEventType).map((key) => ({ key, name: moduleCopy(key).name })),
            durations: option.presentation.durations.map(({ id, months }) => ({ id, months })),
            durationId: duration.id,
        };
    }, [durationPicks, full, lite, moduleCopy, selectedCode, selectedEventType]);

    const onChipKeyDown = useRadioGroupKeys(
        chips.map((chip) => chip.planCode),
        chips.some((chip) => chip.selected) ? selectedCode : null,
        onSelectPlan,
    );

    return {
        isLoading: isPlansLoading || !media,
        isEmpty: full.length === 0 && lite.length === 0,
        chips,
        card,
        onSelectPlan,
        onChipKeyDown,
        onDurationChange: (optionId: string) => {
            if (card) onSelectPlanDuration(card.code, optionId);
        },
    };
}
