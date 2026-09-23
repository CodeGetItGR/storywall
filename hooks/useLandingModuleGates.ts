'use client';

import { useCallback, useMemo } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import type { ModuleKeyConvention } from '@/lib/api/types';

export function useLandingModuleGates() {
    const { data } = useAppConfig();
    const enabledModuleKeys = useMemo(
        () => new Set(data?.modules.filter((module_) => module_.isEnabled).map((module_) => module_.moduleKey)),
        [data?.modules],
    );

    const isAvailable = useCallback(
        (moduleKey: ModuleKeyConvention | null) => moduleKey === null || enabledModuleKeys.has(moduleKey),
        [enabledModuleKeys],
    );

    return { isAvailable };
}
