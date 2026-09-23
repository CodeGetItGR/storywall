'use client';

import { type ChangeEvent, useMemo, useState } from 'react';

import type { EventTypeConvention, ModuleKey, PlatformEventTypeResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

export function usePlanCreateAssignments(
    eventTypes: PlatformEventTypeResponseDto[],
    modules: PlatformModuleResponseDto[],
    initialEventTypeKey: EventTypeConvention | null = null,
    initialModuleKeys: ModuleKey[] = [],
) {
    const [eventTypeKey, setEventTypeKey] = useState<EventTypeConvention | null>(initialEventTypeKey);
    const [moduleKeys, setModuleKeys] = useState<ModuleKey[]>(initialModuleKeys);
    const orderedEventTypes = useMemo(() => [...eventTypes].sort((left, right) => left.sortOrder - right.sortOrder), [eventTypes]);
    const orderedModules = useMemo(() => [...modules].sort((left, right) => left.sortOrder - right.sortOrder), [modules]);

    function handleEventTypeSelect(event: ChangeEvent<HTMLSelectElement>) {
        setEventTypeKey((event.currentTarget.value || null) as EventTypeConvention | null);
    }

    function handleModuleChange(event: ChangeEvent<HTMLInputElement>) {
        const key = event.currentTarget.value as ModuleKey;
        setModuleKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
    }

    function resetAssignments() {
        setEventTypeKey(initialEventTypeKey);
        setModuleKeys(initialModuleKeys);
    }

    return {
        eventTypeKey,
        moduleKeys,
        orderedEventTypes,
        orderedModules,
        handleEventTypeSelect,
        handleModuleChange,
        resetAssignments,
    };
}
