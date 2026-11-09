import { Extension, type JSONContent, Node } from '@tiptap/core';

// Tiptap set up for invitation text: plain text with line breaks, as the
// invitation stores it. Styles belong to the whole text, so there are no marks.

// The whole text is one block that keeps its line breaks, like a code block:
// Enter adds "\n" and pasted line breaks stay.
const PlainTextDocument = Node.create({
    name: 'doc',
    topNode: true,
    content: 'text*',
    code: true,
    whitespace: 'pre',
});

const PlainText = Node.create({ name: 'text', group: 'inline' });

export type PlainTextKeys = {
    undo: () => void;
    redo: () => void;
    done: () => void;
};

// Undo and redo go to the editor's own history, so typing and toolbar changes undo in order.
// Escape finishes editing.
function editorKeys(keys: PlainTextKeys) {
    const run = (action: () => void) => () => {
        action();
        return true;
    };
    return Extension.create({
        name: 'invitationTextKeys',
        addKeyboardShortcuts: () => ({
            'Mod-z': run(keys.undo),
            'Mod-Shift-z': run(keys.redo),
            'Mod-y': run(keys.redo),
            Escape: run(keys.done),
        }),
    });
}

export function plainTextExtensions(keys: PlainTextKeys) {
    return [PlainTextDocument, PlainText, editorKeys(keys)];
}

export function plainTextContent(text: string): JSONContent {
    return { type: 'doc', content: text ? [{ type: 'text', text }] : [] };
}
