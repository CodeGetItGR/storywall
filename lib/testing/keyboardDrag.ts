import { act, fireEvent } from '@testing-library/react';

// Places each element in a column (or a row), so dnd-kit can measure them in jsdom.
export function layOut(elements: HTMLElement[], axis: 'y' | 'x' = 'y', size = 40) {
    elements.forEach((element, index) => {
        const start = index * size;
        const rect = axis === 'y'
            ? { x: 0, y: start, top: start, left: 0, bottom: start + size, right: 300, width: 300, height: size }
            : { x: start, y: 0, top: 0, left: start, bottom: size, right: start + size, width: size, height: size };
        element.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
    });
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));

// Picks an item up by its handle, presses each key, and drops it, as a keyboard user would.
export async function keyboardDrag(handle: HTMLElement, keys: string[]) {
    handle.focus();
    fireEvent.keyDown(handle, { code: 'Space', key: ' ' });
    await settle();
    for (const code of keys) {
        fireEvent.keyDown(document, { code, key: code });
        await settle();
    }
    fireEvent.keyDown(document, { code: 'Space', key: ' ' });
    await settle();
}
