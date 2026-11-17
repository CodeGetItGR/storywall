'use client';

import { useCallback } from 'react';

import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { type FooterPatch, patchFooter } from '@/lib/invitation/sectionSettingsEdits';

// Admin: the footer's font, colour and link.
export function useFooterSettings({ section, edit }: SettingsScope<SectionOf<'footer'>>) {
    const { data } = section;

    const changeStyle = useCallback(
        (key: string, value: string | number | undefined) => {
            if (key !== 'font' && key !== 'textColor') return;
            edit(patchFooter(section.id, { [key]: typeof value === 'string' ? value : undefined } as FooterPatch), `footer:${key}`);
        },
        [edit, section.id],
    );
    const setLink = useCallback((link: string) => edit(patchFooter(section.id, { link })), [edit, section.id]);

    return { values: { font: data.font, textColor: data.textColor }, link: data.link, changeStyle, setLink };
}
