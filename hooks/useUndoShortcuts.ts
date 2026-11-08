'use client';

import { useEffect } from 'react';

// Inputs where the browser undoes typing. A colour picker, checkbox or slider has no undo of its own.
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'number']);

function isTyping(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(target.type);
    return target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
}

// Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo, as in the old editor.
// Inside a text field the browser's own undo runs instead.
export function useUndoShortcuts(undo: () => void, redo: () => void) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey) || event.altKey || isTyping(event.target)) return;
            const key = event.key.toLowerCase();
            if (key === 'z' && !event.shiftKey) {
                event.preventDefault();
                undo();
            } else if ((key === 'z' && event.shiftKey) || key === 'y') {
                event.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [undo, redo]);
}
