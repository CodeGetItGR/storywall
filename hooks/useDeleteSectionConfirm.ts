'use client';

import { useCallback, useRef, useState } from 'react';

import type { InvitationDocument } from '@/lib/invitation/document';
import { deleteSection, type SectionEdit, sectionToFocusAfterDelete } from '@/lib/invitation/sectionActions';
import type { SectionType } from '@/lib/invitation/sections';

type Target = { id: string; type: SectionType };

function sectionFrame(id: string): HTMLElement | null {
    const frames = globalThis.document.querySelectorAll<HTMLElement>('[data-editor-section]');
    return [...frames].find((frame) => frame.dataset.editorSection === id) ?? null;
}

// Deleting a section waits for a yes in the confirmation modal.
export function useDeleteSectionConfirm(edit: SectionEdit, document: InvitationDocument) {
    // Kept after the modal closes, so its text stays while it fades out.
    const [target, setTarget] = useState<Target | null>(null);
    const [isAsking, setIsAsking] = useState(false);
    // After a delete the menu that opened the modal is gone, so focus moves to a neighbouring section.
    const focusAfterClose = useRef<string | null>(null);
    // An undo can take the section away while the modal is open: then the modal closes.
    if (isAsking && target && !document.sections.some((section) => section.id === target.id)) setIsAsking(false);
    const isOpen = isAsking && target !== null;

    const ask = useCallback(
        (id: string) => {
            const section = document.sections.find((item) => item.id === id);
            if (!section || section.locked) return;
            focusAfterClose.current = null;
            setTarget({ id, type: section.type });
            setIsAsking(true);
        },
        [document],
    );
    const cancel = useCallback(() => setIsAsking(false), []);
    const confirm = useCallback(() => {
        if (target) {
            focusAfterClose.current = sectionToFocusAfterDelete(document.sections, target.id);
            edit(deleteSection(target.id));
        }
        setIsAsking(false);
    }, [document, edit, target]);
    // For the modal's finalFocus: the neighbour after a delete, or back to the menu after a cancel.
    const finalFocus = useCallback(() => {
        const id = focusAfterClose.current;
        focusAfterClose.current = null;
        return (id && sectionFrame(id)) || true;
    }, []);

    return { isOpen, sectionType: target?.type ?? null, ask, cancel, confirm, finalFocus };
}
