'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useModuleCopy } from '@/hooks/useModuleCopy';
import { type ManageNavKey, manageSectionModuleKeys } from '@/lib/manageSections';
import { useActiveEvent } from '@/providers/EventProvider';

// The name of a dashboard entry: a page shows its own title, a module section its module's name.
export function useManageSectionLabel() {
    const t = useTranslations('ManagePage');
    const tVendors = useTranslations('Vendors.manage');
    const moduleCopy = useModuleCopy(useActiveEvent()?.eventType);

    return useCallback(
        (key: ManageNavKey) => {
            if (key === 'invitationsQr') return t('sections.invitationsQr');
            if (key === 'vendors') return tVendors('title');
            const moduleKey = manageSectionModuleKeys[key];
            return moduleKey ? moduleCopy(moduleKey).name : t(`sections.${key}`);
        },
        [moduleCopy, t, tVendors],
    );
}
