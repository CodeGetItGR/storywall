import { afterEach, describe, expect, it, vi } from 'vitest';

import { focusFirstUncheckedBox } from '@/lib/createEventSteps';

function mount() {
    document.body.innerHTML = `
        <form id="f">
            <label id="done"><input type="checkbox" checked /> one</label>
            <label id="todo"><input type="checkbox" /> two</label>
        </form>`;
    const animate = vi.fn();
    const scroll = vi.fn();
    for (const el of document.querySelectorAll<HTMLElement>('label, input')) {
        el.animate = animate as unknown as Element['animate'];
        el.scrollIntoView = scroll;
    }
    return { animate, scroll, todo: document.querySelector('#todo input') as HTMLInputElement };
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('focusFirstUncheckedBox', () => {
    it('scrolls to and focuses the first unticked box', () => {
        const { scroll, todo, animate } = mount();
        focusFirstUncheckedBox('f');
        expect(scroll).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(todo);
        expect(animate).not.toHaveBeenCalled();
    });

    it('lights up the box row when asked', () => {
        const { animate } = mount();
        focusFirstUncheckedBox('f', { highlight: true });
        expect(animate).toHaveBeenCalledTimes(1);
        expect(animate.mock.contexts[0]).toBe(document.getElementById('todo'));
    });

    it('does nothing when every box is ticked', () => {
        const { scroll, todo } = mount();
        todo.checked = true;
        focusFirstUncheckedBox('f', { highlight: true });
        expect(scroll).not.toHaveBeenCalled();
    });
});
