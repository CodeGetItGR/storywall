'use client';

import { useCallback } from 'react';

import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { addDressCodeColor, MAX_DRESS_CODE_COLORS, removeDressCodeColor, setDressCodeColor } from '@/lib/invitation/sectionSettingsEdits';

// A new colour starts as the last one, or the theme's main colour, as in the old panel.
export function useDressCodeSettings({ section, edit, theme }: SettingsScope<SectionOf<'dressCode'>>) {
    const { colors } = section.data;
    const nextColor = colors.at(-1) ?? theme.colors.primary;

    const add = useCallback(() => edit(addDressCodeColor(section.id, nextColor)), [edit, nextColor, section.id]);
    const change = useCallback(
        (index: number, color: string) => edit(setDressCodeColor(section.id, index, color), `color:${index}`),
        [edit, section.id],
    );
    const remove = useCallback((index: number) => edit(removeDressCodeColor(section.id, index)), [edit, section.id]);

    return { colors, canAdd: colors.length < MAX_DRESS_CODE_COLORS, add, change, remove };
}
