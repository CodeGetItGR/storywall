'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { PlatformModuleResponseDto } from '@/lib/api/types';
import { getModuleMeta } from '@/lib/planModules';

export function useLocalizedModuleLabel(modules: PlatformModuleResponseDto[]) {
    const tModules = useTranslations('Modules');

    return useCallback(
        (moduleKey: string) => {
            const meta = getModuleMeta(moduleKey, modules);
            return {
                name: tModules.has(`${moduleKey}.name`) ? tModules(`${moduleKey}.name`) : meta.name,
                description: tModules.has(`${moduleKey}.description`) ? tModules(`${moduleKey}.description`) : meta.description,
                Icon: meta.Icon,
            };
        },
        [modules, tModules]
    );
}
