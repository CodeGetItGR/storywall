'use client';

import { type ChangeEvent, useMemo, useState } from 'react';

import { useEventTypeModuleMatrix } from '@/hooks/useEventTypeModuleMatrix';
import type { EventTypeConvention, ModuleKey, PlatformEventTypeResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

export function usePlanCreateAssignments(
    eventTypes: PlatformEventTypeResponseDto[],
    modules: PlatformModuleResponseDto[],
    initialEventTypeKey: EventTypeConvention | null = null,
    initialModuleKeys: ModuleKey[] = [],
) {
    const [eventTypeKey, setEventTypeKey] = useState<EventTypeConvention | null>(initialEventTypeKey);
    const [pickedModuleKeys, setPickedModuleKeys] = useState<ModuleKey[]>(initialModuleKeys);
    const matrix = useEventTypeModuleMatrix(eventTypeKey);
    const orderedEventTypes = useMemo(() => [...eventTypes].sort((left, right) => left.sortOrder - right.sortOrder), [eventTypes]);
    // The server refuses a module the event type doesn't support, so those aren't offered.
    const unsupported = useMemo(
        () => new Set((matrix.data ?? []).filter((row) => row.applicability === 'UNSUPPORTED').map((row) => row.moduleKey)),
        [matrix.data],
    );
    const orderedModules = useMemo(
        () => modules.filter((moduleItem) => !unsupported.has(moduleItem.moduleKey)).sort((left, right) => left.sortOrder - right.sortOrder),
        [modules, unsupported],
    );
    // A module picked before the type's support loaded, or under another type, drops out once unsupported.
    const moduleKeys = useMemo(() => pickedModuleKeys.filter((key) => !unsupported.has(key)), [pickedModuleKeys, unsupported]);

    function handleEventTypeSelect(event: ChangeEvent<HTMLSelectElement>) {
        setEventTypeKey((event.currentTarget.value || null) as EventTypeConvention | null);
    }

    function handleModuleChange(event: ChangeEvent<HTMLInputElement>) {
        const key = event.currentTarget.value as ModuleKey;
        setPickedModuleKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
    }

    function resetAssignments() {
        setEventTypeKey(initialEventTypeKey);
        setPickedModuleKeys(initialModuleKeys);
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
