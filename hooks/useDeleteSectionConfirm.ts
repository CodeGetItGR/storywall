'use client';

import { useCallback, useState } from 'react';

import type { InvitationDocument } from '@/lib/invitation/document';
import { deleteSection, type SectionEdit } from '@/lib/invitation/sectionActions';
import type { SectionType } from '@/lib/invitation/sections';

type Target = { id: string; type: SectionType };

// Deleting a section waits for a yes in the confirmation modal.
export function useDeleteSectionConfirm(edit: SectionEdit, document: InvitationDocument) {
    // Kept after the modal closes, so its text stays while it fades out.
    const [target, setTarget] = useState<Target | null>(null);
    const [isAsking, setIsAsking] = useState(false);
    // An undo can take the section away while the modal is open.
    const isOpen = isAsking && target !== null && document.sections.some((section) => section.id === target.id);

    const ask = useCallback(
        (id: string) => {
            const section = document.sections.find((item) => item.id === id);
            if (!section || section.locked) return;
            setTarget({ id, type: section.type });
            setIsAsking(true);
        },
        [document],
    );
    const cancel = useCallback(() => setIsAsking(false), []);
    const confirm = useCallback(() => {
        if (target) edit(deleteSection(target.id));
        setIsAsking(false);
    }, [edit, target]);

    return { isOpen, sectionType: target?.type ?? null, ask, cancel, confirm };
}
