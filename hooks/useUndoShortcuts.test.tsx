import { cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useUndoShortcuts } from '@/hooks/useUndoShortcuts';

function setup() {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => useUndoShortcuts(undo, redo));
    return { undo, redo };
}

describe('useUndoShortcuts', () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
    });

    it('undoes on Ctrl+Z and Cmd+Z', () => {
        const { undo, redo } = setup();
        fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
        fireEvent.keyDown(window, { key: 'z', metaKey: true });
        expect(undo).toHaveBeenCalledTimes(2);
        expect(redo).not.toHaveBeenCalled();
    });

    it('redoes on Ctrl+Shift+Z and Ctrl+Y', () => {
        const { undo, redo } = setup();
        fireEvent.keyDown(window, { key: 'Z', ctrlKey: true, shiftKey: true });
        fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
        expect(redo).toHaveBeenCalledTimes(2);
        expect(undo).not.toHaveBeenCalled();
    });

    it('leaves Z alone without Ctrl or Cmd', () => {
        const { undo } = setup();
        fireEvent.keyDown(window, { key: 'z' });
        fireEvent.keyDown(window, { key: 'z', ctrlKey: true, altKey: true });
        expect(undo).not.toHaveBeenCalled();
    });

    it('leaves undo to the browser inside a text field', () => {
        const { undo } = setup();
        const input = document.createElement('input');
        document.body.append(input);
        fireEvent.keyDown(input, { key: 'z', ctrlKey: true });
        expect(undo).not.toHaveBeenCalled();
    });
});
