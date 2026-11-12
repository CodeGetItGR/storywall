'use client';

import { useCallback, useMemo, useState } from 'react';

import type { InvitationDocument } from '@/lib/invitation/document';
import { followFromTheStart, type InvitationEventData, type SampleSections } from '@/lib/invitation/eventLinks';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import { canAddAt, insertSection, type SectionEdit, type SectionSlot } from '@/lib/invitation/sectionActions';
import { addableSectionTypes, type EditorMode } from '@/lib/invitation/sectionRules';

// A "+" on the canvas: which sections it offers and adding one where it sits.
export function useAddSectionList(
    edit: SectionEdit,
    document: InvitationDocument,
    eventType: string,
    mode: EditorMode,
    onAdded: (sectionId: string) => void,
    event: InvitationEventData | null = null,
    samples: SampleSections | null = null,
) {
    // Where the list adds, while it is open.
    const [slot, setSlot] = useState<SectionSlot | null>(null);
    const types = useMemo(() => addableSectionTypes(document, eventType, mode), [document, eventType, mode]);
    // An undo can take away the section the "+" belonged to while the list is open: then the list closes.
    if (slot && !canAddAt(document.sections, slot)) setSlot(null);

    const open = useCallback((next: SectionSlot) => setSlot(next), []);
    const close = useCallback(() => setSlot(null), []);
    const add = useCallback(
        (type: NewSectionType) => {
            setSlot(null);
            if (!slot || !canAddAt(document.sections, slot)) return;
            const section = createSection(type, eventType);
            // One edit: the section and, on a draft with an event, its link to it.
            edit((draft) => {
                insertSection(slot, section)(draft);
                if (event) followFromTheStart(section.id, event, samples)(draft);
            });
            onAdded(section.id);
        },
        [slot, document, edit, eventType, onAdded, event, samples],
    );

    return { isOpen: slot !== null, types, open, close, add };
}
