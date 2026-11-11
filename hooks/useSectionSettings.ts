'use client';

import { useCallback, useMemo, useState } from 'react';

import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { EditorMode } from '@/lib/invitation/sectionRules';
import type { InvitationSection } from '@/lib/invitation/sections';
import { type DocumentRecipe, hasSectionSettings, settingMergeKey, settingsGroups } from '@/lib/invitation/sectionSettings';
import type { ThemeDesign } from '@/lib/invitation/theme';

// Applies one settings change. Changes to the same field within a second
// (dragging a colour, typing a size) are one undo step.
export type SettingsEdit = (recipe: DocumentRecipe, field?: string) => void;

// The section whose settings are open. It closes by itself when the section
// goes away (an undo removed it) or has nothing left to set.
export function useSectionSettings(store: InvitationEditorStore, document: InvitationDocument, theme: ThemeDesign, mode: EditorMode) {
    const [openId, setOpenId] = useState<string | null>(null);

    const section = useMemo(() => document.sections.find((item) => item.id === openId) ?? null, [document.sections, openId]);
    const groups = useMemo(() => (section ? settingsGroups(section, mode, theme) : []), [mode, section, theme]);
    const isOpen = section !== null && groups.length > 0;

    const open = useCallback((id: string) => setOpenId(id), []);
    const close = useCallback(() => setOpenId(null), []);
    const hasSettings = useCallback((item: InvitationSection) => hasSectionSettings(item, mode, theme), [mode, theme]);

    const edit = useCallback<SettingsEdit>(
        (recipe, field) => {
            if (!openId) return;
            store.getState().edit(recipe, field ? settingMergeKey(openId, field) : undefined);
        },
        [openId, store],
    );

    return { section: isOpen ? section : null, groups, isOpen, open, close, hasSettings, edit, mode };
}

export type SectionSettings = ReturnType<typeof useSectionSettings>;
