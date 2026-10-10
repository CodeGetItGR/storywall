'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useModuleCopy } from '@/hooks/useModuleCopy';
import { type ManageSection, manageSectionModuleKeys } from '@/lib/manageSections';
import { useActiveEvent } from '@/providers/EventProvider';

export function useManageSectionLabel() {
    const t = useTranslations('ManagePage');
    const moduleCopy = useModuleCopy(useActiveEvent()?.eventType);

    return useCallback(
        (section: ManageSection) => {
            const moduleKey = manageSectionModuleKeys[section];
            return moduleKey ? moduleCopy(moduleKey).name : t(`sections.${section}`);
        },
        [moduleCopy, t],
    );
}
