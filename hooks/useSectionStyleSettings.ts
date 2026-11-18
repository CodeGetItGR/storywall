'use client';

import { useCallback, useMemo } from 'react';

import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { patchSectionStyle, sectionStyleValues } from '@/lib/invitation/sectionSettingsEdits';
import { programStyleView } from '@/lib/invitation/sectionStyleFields';

// The values a section's style fields show, and the change each field makes.
export function useSectionStyleSettings({ section, edit }: SettingsScope) {
    const values = useMemo(() => {
        const stored = sectionStyleValues(section);
        return section.type === 'program' || section.type === 'programIcons' ? programStyleView(stored) : stored;
    }, [section]);

    const change = useCallback(
        (key: string, value: string | number | undefined) => edit(patchSectionStyle(section.id, { [key]: value }), `style:${key}`),
        [edit, section.id],
    );

    return { values, change };
}
