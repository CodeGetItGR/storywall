'use client';

import { type ChangeEvent, useMemo, useState } from 'react';

import type { EventTypeConvention, ModuleKey, PlatformEventTypeResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

export function usePlanCreateAssignments(
    eventTypes: PlatformEventTypeResponseDto[],
    modules: PlatformModuleResponseDto[],
    initialEventTypeKeys: EventTypeConvention[] = [],
    initialModuleKeys: ModuleKey[] = []
) {
    const initialAvailabilityMode = initialEventTypeKeys.length === 0 ? 'ALL' : 'SELECTED';
    const [availabilityMode, setAvailabilityMode] = useState<'ALL' | 'SELECTED'>(initialAvailabilityMode);
    const [eventTypeKeys, setEventTypeKeys] = useState<EventTypeConvention[]>(initialEventTypeKeys);
    const [moduleKeys, setModuleKeys] = useState<ModuleKey[]>(initialModuleKeys);
    const orderedEventTypes = useMemo(() => [...eventTypes].sort((left, right) => left.sortOrder - right.sortOrder), [eventTypes]);
    const orderedModules = useMemo(() => [...modules].sort((left, right) => left.sortOrder - right.sortOrder), [modules]);

    function selectAllEventTypes() {
        setAvailabilityMode('ALL');
        setEventTypeKeys([]);
    }

    function selectSpecificEventTypes() {
        setAvailabilityMode('SELECTED');
    }

    function handleEventTypeChange(event: ChangeEvent<HTMLInputElement>) {
        const key = event.currentTarget.value as EventTypeConvention;
        setEventTypeKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
    }

    function handleModuleChange(event: ChangeEvent<HTMLInputElement>) {
        const key = event.currentTarget.value as ModuleKey;
        setModuleKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
    }

    function resetAssignments() {
        setAvailabilityMode(initialAvailabilityMode);
        setEventTypeKeys(initialEventTypeKeys);
        setModuleKeys(initialModuleKeys);
    }

    return {
        availabilityMode,
        eventTypeKeys,
        moduleKeys,
        orderedEventTypes,
        orderedModules,
        selectAllEventTypes,
        selectSpecificEventTypes,
        handleEventTypeChange,
        handleModuleChange,
        resetAssignments,
    };
}
