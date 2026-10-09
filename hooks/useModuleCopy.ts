'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { EventTypeConvention } from '@/lib/api/types';
import { getModuleMeta, resolveModuleCopy } from '@/lib/planModules';
import { useActiveEvent } from '@/providers/EventProvider';

// Name, description, plan-card label and icon of a module as any event type
// calls it. Without an event type, the defaults.
export function useModuleCopyResolver() {
    const { data: appConfig } = useAppConfig();
    const localizedText = useLocalizedText();
    const tModules = useTranslations('Modules');

    const eventTypes = appConfig?.translations.eventTypes;
    const modules = appConfig?.modules;

    return useCallback(
        (eventTypeKey: EventTypeConvention | null | undefined, moduleKey: string) => {
            const platform = getModuleMeta(moduleKey, modules ?? []);
            const copy = resolveModuleCopy({
                override: eventTypeKey ? eventTypes?.[eventTypeKey]?.modules?.[moduleKey] : undefined,
                translated: {
                    name: tModules.has(`${moduleKey}.name`) ? tModules(`${moduleKey}.name`) : undefined,
                    description: tModules.has(`${moduleKey}.description`) ? tModules(`${moduleKey}.description`) : undefined,
                },
                platform,
                localize: (text) => localizedText(text),
            });
            return { ...copy, Icon: platform.Icon };
        },
        [eventTypes, localizedText, modules, tModules],
    );
}

// The same, for one event type. Pass the event's (or plan's) type.
export function useModuleCopy(eventTypeKey: EventTypeConvention | null | undefined) {
    const resolve = useModuleCopyResolver();
    return useCallback((moduleKey: string) => resolve(eventTypeKey, moduleKey), [eventTypeKey, resolve]);
}

// One module's copy for the event in view.
export function useActiveModuleCopy(moduleKey: string) {
    const activeEvent = useActiveEvent();
    return useModuleCopy(activeEvent?.eventType)(moduleKey);
}
