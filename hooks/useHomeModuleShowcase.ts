'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { modulePreviews, PREVIEWABLE_MODULE_KEYS } from '@/components/home/modulePreviews';
import { useAppConfig } from '@/hooks/useAppConfig';
import { getModuleMeta } from '@/lib/planModules';

export type ShowcaseModule = {
    key: string;
    name: string;
    /** Short benefit-led line written for discovery, not the plan-comparison description. */
    summary: string;
    /** Fuller explanation shown in the detail sheet. */
    detail: string;
};

export function useHomeModuleShowcase() {
    const t = useTranslations('HomePage');
    const tModules = useTranslations('Modules');
    const { data: appConfig } = useAppConfig();
    const [openModuleKey, setOpenModuleKey] = useState<string | null>(null);

    const platformModules = useMemo(() => appConfig?.modules ?? [], [appConfig?.modules]);
    const enabledKeys = useMemo(
        () => new Set(platformModules.filter((module_) => module_.isEnabled).map((module_) => module_.moduleKey)),
        [platformModules]
    );

    const modules = useMemo<ShowcaseModule[]>(() => {
        // Before config resolves there is nothing to filter against, so show the full set rather
        // than an empty row that pops in later.
        const keys = PREVIEWABLE_MODULE_KEYS.filter(
            (moduleKey) => modulePreviews[moduleKey] && (enabledKeys.size === 0 || enabledKeys.has(moduleKey))
        );

        return keys.map((moduleKey) => {
            const meta = getModuleMeta(moduleKey, platformModules);
            return {
                key: moduleKey,
                name: tModules.has(`${moduleKey}.name`) ? tModules(`${moduleKey}.name`) : meta.name,
                summary: t(`modules.summary.${moduleKey}`),
                detail: t(`modules.detail.${moduleKey}`),
            };
        });
    }, [enabledKeys, platformModules, t, tModules]);

    const openModule = useMemo(() => modules.find((module_) => module_.key === openModuleKey) ?? null, [modules, openModuleKey]);

    const handleOpenModule = useCallback((moduleKey: string) => {
        setOpenModuleKey(moduleKey);
    }, []);

    const handleCloseModule = useCallback(() => {
        setOpenModuleKey(null);
    }, []);

    return { modules, openModule, handleOpenModule, handleCloseModule };
}
