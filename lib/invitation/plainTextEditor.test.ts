import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { plainTextContent, plainTextExtensions } from '@/lib/invitation/plainTextEditor';

let editor: Editor | null = null;

function createEditor(text: string) {
    const keys = { undo: vi.fn(), redo: vi.fn(), done: vi.fn() };
    const mount = document.createElement('div');
    document.body.append(mount);
    editor = new Editor({ element: { mount }, extensions: plainTextExtensions(keys), content: plainTextContent(text), injectCSS: false });
    return { editor, keys };
}

function press(target: Editor, key: string, init: KeyboardEventInit = {}) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    target.view.someProp('handleKeyDown', (handler) => handler(target.view, event));
}

describe('plain text editor', () => {
    afterEach(() => {
        editor?.destroy();
        editor = null;
        document.body.replaceChildren();
    });

    it('holds the text as it is stored, line breaks included', () => {
        const { editor } = createEditor('Μαρία\n& Γιώργος');
        expect(editor.state.doc.textContent).toBe('Μαρία\n& Γιώργος');
        expect(editor.view.dom.textContent).toBe('Μαρία\n& Γιώργος');
    });

    it('starts empty for an empty text', () => {
        expect(plainTextContent('')).toEqual({ type: 'doc', content: [] });
        const { editor } = createEditor('');
        expect(editor.state.doc.textContent).toBe('');
    });

    it('adds a line break on Enter', () => {
        const { editor } = createEditor('Γάμος');
        editor.commands.setTextSelection(editor.state.doc.content.size);
        press(editor, 'Enter');
        editor.commands.insertContent('2027');
        expect(editor.state.doc.textContent).toBe('Γάμος\n2027');
    });

    it("sends undo, redo and Escape to the invitation editor", () => {
        const { editor, keys } = createEditor('Γάμος');
        press(editor, 'z', { ctrlKey: true });
        press(editor, 'z', { ctrlKey: true, shiftKey: true });
        press(editor, 'y', { ctrlKey: true });
        press(editor, 'Escape');
        expect(keys.undo).toHaveBeenCalledOnce();
        expect(keys.redo).toHaveBeenCalledTimes(2);
        expect(keys.done).toHaveBeenCalledOnce();
    });
});
