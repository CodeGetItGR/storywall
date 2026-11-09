'use client';

import { useCallback, useMemo, useState } from 'react';

import type { InvitationDocument } from '@/lib/invitation/document';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import { insertSectionAfter, type SectionEdit } from '@/lib/invitation/sectionActions';
import { addableSectionTypes, type EditorMode } from '@/lib/invitation/sectionRules';

// The "+" between two sections: which sections it offers and adding one.
export function useAddSectionList(
    edit: SectionEdit,
    document: InvitationDocument,
    eventType: string,
    mode: EditorMode,
    onAdded: (sectionId: string) => void,
) {
    // The section the list adds after, while it is open.
    const [afterId, setAfterId] = useState<string | null>(null);
    const types = useMemo(() => addableSectionTypes(document, eventType, mode), [document, eventType, mode]);

    const open = useCallback((sectionId: string) => setAfterId(sectionId), []);
    const close = useCallback(() => setAfterId(null), []);
    const add = useCallback(
        (type: NewSectionType) => {
            if (!afterId) return;
            const section = createSection(type, eventType);
            edit(insertSectionAfter(afterId, section));
            setAfterId(null);
            onAdded(section.id);
        },
        [afterId, edit, eventType, onAdded],
    );

    return { isOpen: afterId !== null, types, open, close, add };
}
