'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorState, InvitationEditorStore } from '@/lib/invitation/editorStore';
import { INVITATION_LABELS, invitationLanguage } from '@/lib/invitation/labels';
import {
    addTextElement,
    canAddText,
    type ColorScope,
    deleteText,
    isEmptyAddedText,
    readText,
    textMergeKey,
    type TextRole,
    textSectionId,
    type TextStylePatch,
    type TextTarget,
    textTargetKey,
    writeColor,
    writeStyle,
    writeText,
} from '@/lib/invitation/textEditing';

// Where the caret goes when a text opens: where it was tapped, at the end, or over all of it (a new text).
export type CaretRequest = { x: number; y: number } | 'end' | 'all';

const NEW_TEXT_WORDING: Record<TextRole, 'newTitle' | 'newSubtitle' | 'newParagraph'> = {
    title: 'newTitle',
    subtitle: 'newSubtitle',
    paragraph: 'newParagraph',
};

function newElementId(): string {
    return `text-${crypto.randomUUID()}`;
}

// The text being edited in place and every change the toolbar makes to it. All of it goes
// through the editor store, so undo, redo and autosave cover it.
export function useInlineTextEdit(store: InvitationEditorStore, document: InvitationDocument) {
    const [target, setTarget] = useState<TextTarget | null>(null);
    const [caret, setCaret] = useState<CaretRequest>('end');
    const [element, setElement] = useState<HTMLElement | null>(null);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    // The fields each section shows, so a section's colour reaches the ones with no style of their own.
    const fieldPaths = useRef(new Map<string, Map<string, number>>());

    // An undo can take the text away; then nothing is being edited.
    const snapshot = target ? readText(document, target) : undefined;
    const active = target && snapshot ? target : null;
    const activeKey = active ? textTargetKey(active) : null;
    const sectionId = active ? textSectionId(document, active) : undefined;

    const edit = useCallback<InvitationEditorState['edit']>((recipe, mergeKey) => store.getState().edit(recipe, mergeKey), [store]);

    // An added text left empty goes away when the host moves on, as in the old editor. It joins the typing's undo step.
    const dropIfEmpty = useCallback(
        (left: TextTarget | null) => {
            if (left && isEmptyAddedText(store.getState().document, left)) {
                edit((draft) => deleteText(draft, left), textMergeKey(left, 'text'));
            }
        },
        [edit, store],
    );

    const activate = useCallback(
        (next: TextTarget, at: CaretRequest = 'end') => {
            if (target && textTargetKey(target) !== textTargetKey(next)) dropIfEmpty(target);
            setCaret(at);
            setTarget(next);
            setIsConfirmingDelete(false);
        },
        [dropIfEmpty, target],
    );

    const deactivate = useCallback(() => {
        dropIfEmpty(target);
        setTarget(null);
        setElement(null);
        setIsConfirmingDelete(false);
    }, [dropIfEmpty, target]);

    const setText = useCallback(
        (text: string) => {
            if (!active) return;
            edit((draft) => writeText(draft, active, text), textMergeKey(active, 'text'));
        },
        [active, edit],
    );

    const setStyle = useCallback(
        (patch: TextStylePatch) => {
            if (!active) return;
            edit((draft) => writeStyle(draft, active, patch), textMergeKey(active, Object.keys(patch).join('+')));
        },
        [active, edit],
    );

    const applyColor = useCallback(
        (color: string, scope: ColorScope) => {
            if (!active) return;
            const paths = sectionId ? [...(fieldPaths.current.get(sectionId)?.keys() ?? [])] : [];
            edit((draft) => writeColor(draft, active, color, scope, paths), textMergeKey(active, `color-${scope}`));
        },
        [active, edit, sectionId],
    );

    const addText = useCallback(
        (role: TextRole) => {
            if (!active || !sectionId) return;
            const id = newElementId();
            const wording = INVITATION_LABELS[invitationLanguage(document)][NEW_TEXT_WORDING[role]];
            const after = active.kind === 'element' ? active.elementId : undefined;
            edit((draft) => addTextElement(draft, sectionId, { id, role, text: wording }, after));
            activate({ kind: 'element', elementId: id }, 'all');
        },
        [activate, active, document, edit, sectionId],
    );

    // An added text goes at once; a section's own text asks first.
    const requestDelete = useCallback(() => {
        if (!active) return;
        if (active.kind === 'field') {
            setIsConfirmingDelete(true);
            return;
        }
        edit((draft) => deleteText(draft, active));
        setTarget(null);
        setElement(null);
    }, [active, edit]);

    const confirmDelete = useCallback(() => {
        if (active) edit((draft) => deleteText(draft, active));
        setIsConfirmingDelete(false);
        setTarget(null);
        setElement(null);
    }, [active, edit]);

    const cancelDelete = useCallback(() => setIsConfirmingDelete(false), []);

    const registerField = useCallback((section: string, path: string) => {
        const paths = fieldPaths.current.get(section) ?? new Map<string, number>();
        fieldPaths.current.set(section, paths);
        paths.set(path, (paths.get(path) ?? 0) + 1);
        return () => {
            const count = (paths.get(path) ?? 1) - 1;
            if (count > 0) paths.set(path, count);
            else paths.delete(path);
        };
    }, []);

    const undo = useCallback(() => store.getState().undo(), [store]);
    const redo = useCallback(() => store.getState().redo(), [store]);

    return useMemo(
        () => ({
            active,
            activeKey,
            snapshot: active ? snapshot : undefined,
            caret,
            element: active ? element : null,
            setElement,
            canAddText: sectionId ? canAddText(document, sectionId) : false,
            isConfirmingDelete,
            activate,
            deactivate,
            setText,
            setStyle,
            applyColor,
            addText,
            requestDelete,
            confirmDelete,
            cancelDelete,
            registerField,
            undo,
            redo,
        }),
        [
            active,
            activeKey,
            snapshot,
            caret,
            element,
            sectionId,
            document,
            isConfirmingDelete,
            activate,
            deactivate,
            setText,
            setStyle,
            applyColor,
            addText,
            requestDelete,
            confirmDelete,
            cancelDelete,
            registerField,
            undo,
            redo,
        ],
    );
}

export type InlineTextEdit = ReturnType<typeof useInlineTextEdit>;
