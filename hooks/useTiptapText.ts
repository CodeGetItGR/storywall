'use client';

import { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react';

import type { CaretRequest } from '@/hooks/useInlineTextEdit';
import { plainTextContent, plainTextExtensions } from '@/lib/invitation/plainTextEditor';

type TiptapTextOptions = {
    host: RefObject<HTMLElement | null>;
    // The text box's name for screen readers.
    label: string;
    value: string;
    caret: CaretRequest;
    onChange: (text: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    onDone: () => void;
    onToolbar: () => boolean;
};

// Puts the caret where the text was tapped, at its end, or over all of it.
function placeCaret(editor: Editor, caret: CaretRequest) {
    const { view } = editor;
    const { doc } = view.state;
    let from = doc.content.size;
    let to = from;
    if (caret === 'all') {
        from = 0;
    } else if (caret !== 'end') {
        // jsdom has no layout, so a tap there finds no position.
        try {
            const found = view.posAtCoords({ left: caret.x, top: caret.y });
            if (found) from = to = found.pos;
        } catch {
            // Keep the end.
        }
    }
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, from, to)));
    // Focus now, inside the tap that opened the text: phones only show the keyboard then.
    view.focus();
}

// Tiptap on the element of the text being edited. It mounts as the page commits, so the
// keyboard opens in the same tap, and follows the stored text when undo or redo changes it.
export function useTiptapText({ host, label, value, caret, onChange, onUndo, onRedo, onDone, onToolbar }: TiptapTextOptions) {
    const editorRef = useRef<Editor | null>(null);
    const latest = useRef({ value, caret, onChange, onUndo, onRedo, onDone, onToolbar });
    useLayoutEffect(() => {
        latest.current = { value, caret, onChange, onUndo, onRedo, onDone, onToolbar };
    });

    useLayoutEffect(() => {
        const mount = host.current;
        if (!mount) return;
        const created = new Editor({
            element: { mount },
            extensions: plainTextExtensions({
                undo: () => latest.current.onUndo(),
                redo: () => latest.current.onRedo(),
                done: () => latest.current.onDone(),
                toolbar: () => latest.current.onToolbar(),
            }),
            content: plainTextContent(latest.current.value),
            injectCSS: false,
            editorProps: {
                attributes: { spellcheck: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': label },
                // Pasted text arrives as plain text, line breaks kept.
                handlePaste: (view, event) => {
                    const text = event.clipboardData?.getData('text/plain');
                    if (text === undefined) return false;
                    view.dispatch(view.state.tr.insertText(text.replace(/\r\n?/g, '\n')));
                    return true;
                },
            },
            onUpdate: ({ editor: updated }) => latest.current.onChange(updated.state.doc.textContent),
        });
        placeCaret(created, latest.current.caret);
        editorRef.current = created;
        return () => {
            editorRef.current = null;
            created.destroy();
        };
    }, [host, label]);

    // Undo, redo or a cut to the length limit changed the stored text.
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || editor.state.doc.textContent === value) return;
        editor.commands.setContent(plainTextContent(value), { emitUpdate: false });
    }, [value]);
}
