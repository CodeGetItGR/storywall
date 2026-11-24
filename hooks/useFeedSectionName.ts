'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { HE_OR_SHE_MODULE } from '@/hooks/useHeOrShe';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventTypeConvention } from '@/lib/api/types';
import { moduleOfBlock } from '@/lib/feedModuleBlocks';
import { sectionNameKey } from '@/lib/invitation/sectionNames';
import type { InvitationSection, SectionType } from '@/lib/invitation/sections';

// A block's name in edit mode and the Add sheet: its sectionNames key, or the module's own name for Boy or Girl. A
// module block is named after its module, so it needs the section itself (blockName).
export function useFeedSectionName(eventType: EventTypeConvention | null) {
    const t = useTranslations('InvitationEditor');
    const moduleCopy = useModuleCopy(eventType);

    const sectionName = useCallback(
        (type: Exclude<SectionType, 'feedModule'>) =>
            type === 'feedHeOrShe' ? moduleCopy(HE_OR_SHE_MODULE).name : t(sectionNameKey(type, eventType)),
        [eventType, moduleCopy, t],
    );
    const blockName = useCallback(
        (section: InvitationSection) => {
            if (section.type !== 'feedModule') return sectionName(section.type);
            const key = moduleOfBlock(section);
            return key ? moduleCopy(key).name : '';
        },
        [moduleCopy, sectionName],
    );

    return { sectionName, blockName };
}
