'use client';

import { type KeyboardEvent, type MouseEvent, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';

import type { InlineTextEdit } from '@/hooks/useInlineTextEdit';
import { type TextTarget, textTargetKey } from '@/lib/invitation/textEditing';

// One text on the editor canvas: whether it is the one being edited, and how a tap or a key opens it.
export function useEditableText(edit: InlineTextEdit, target: TextTarget) {
    const key = textTargetKey(target);
    const { activate, registerField } = edit;
    const sectionId = target.kind === 'field' ? target.sectionId : undefined;
    const path = target.kind === 'field' ? target.path : undefined;

    // The section's colour also reaches the fields it shows that have no style of their own.
    useEffect(() => (sectionId && path ? registerField(sectionId, path) : undefined), [path, registerField, sectionId]);

    // The text opens and takes focus within the tap itself, or phones keep the keyboard closed.
    const open = useCallback(
        (event: MouseEvent<HTMLElement>) => {
            event.stopPropagation();
            flushSync(() => activate(target, { x: event.clientX, y: event.clientY }));
        },
        // The target is rebuilt every render; its key says when it changed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [activate, key],
    );

    const openWithKey = useCallback(
        (event: KeyboardEvent<HTMLElement>) => {
            if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'F2') return;
            event.preventDefault();
            flushSync(() => activate(target, 'end'));
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [activate, key],
    );

    const done = useCallback(() => edit.deactivate(), [edit]);

    return { key, isActive: edit.activeKey === key, open, openWithKey, done };
}
