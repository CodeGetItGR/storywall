'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useRadioGroupKeys } from '@/hooks/useRadioGroupKeys';
import type { EventTypeConvention } from '@/lib/api/types';
import { createEventTypePhoto } from '@/lib/createEventCatalog';
import { type CreateEventFeatureKey, createEventFeatures, featureLineSource } from '@/lib/createEventFeatures';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

export type TypeChip = { key: EventTypeConvention; name: string; photoSrc: string; selected: boolean };
export type BigFeature = { key: CreateEventFeatureKey; name: string; line: string };
export type SmallFeature = { key: CreateEventFeatureKey; name: string };

// The type step as plain values: the picked type's photo, the chips, and what the type includes.
export function useCreateEventWizardTypeStep() {
    const t = useTranslations('CreateEventPage.wizard');
    const tModules = useTranslations('Modules');
    const { data: appConfig } = useAppConfig();
    const { eventTypes, selectedEventType, onSelectEventType } = useCreateEventForm();
    const typeCopy = useLocalizedAppEventTypeCopy();
    const moduleCopy = useModuleCopy(selectedEventType);

    const chips: TypeChip[] = useMemo(
        () =>
            eventTypes.map((type) => ({
                key: type.eventTypeKey,
                name: typeCopy(type.eventTypeKey).name,
                photoSrc: createEventTypePhoto(type.eventTypeKey, type.imageUrl),
                selected: type.eventTypeKey === selectedEventType,
            })),
        [eventTypes, selectedEventType, typeCopy],
    );
    const picked = chips.find((chip) => chip.selected) ?? chips[0];

    const features = useMemo(() => {
        const { big, small, showPlanNote } = createEventFeatures(appConfig, selectedEventType);
        const line = (key: CreateEventFeatureKey) =>
            featureLineSource(key) === 'wizard' ? t(`features.lines.${key}`) : tModules(`${key}.description`);
        return {
            big: big.map((key): BigFeature => ({ key, name: moduleCopy(key).name, line: line(key) })),
            small: small.map((key): SmallFeature => ({ key, name: moduleCopy(key).name })),
            showPlanNote,
        };
    }, [appConfig, moduleCopy, selectedEventType, t, tModules]);

    const onKeyDown = useRadioGroupKeys(
        chips.map((chip) => chip.key),
        selectedEventType,
        (key) => onSelectEventType(key as EventTypeConvention),
    );

    return { chips, picked, features, onSelect: onSelectEventType, onKeyDown };
}
