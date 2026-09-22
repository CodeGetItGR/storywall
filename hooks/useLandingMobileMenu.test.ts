import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useLandingMobileMenu } from '@/hooks/useLandingMobileMenu';

// The hook drives real DOM focus, so the test mounts the markup the hero
// renders: a toggle button, the menu's links, and a control outside both.
function mountMenu() {
    document.body.innerHTML = `
        <button id="toggle" type="button">Menu</button>
        <nav id="menu"><a href="#a" id="first">A</a><a href="#b" id="middle">B</a><a href="#c" id="last">C</a></nav>
        <a href="#outside" id="outside">Outside</a>
    `;
    return {
        toggle: document.getElementById('toggle') as HTMLButtonElement,
        menu: document.getElementById('menu') as HTMLElement,
        first: document.getElementById('first') as HTMLAnchorElement,
        last: document.getElementById('last') as HTMLAnchorElement,
        outside: document.getElementById('outside') as HTMLAnchorElement,
    };
}

function renderMenu() {
    const dom = mountMenu();
    const hook = renderHook(() => useLandingMobileMenu());
    act(() => {
        hook.result.current.menuRef.current = dom.menu;
        hook.result.current.toggleRef.current = dom.toggle;
    });
    return { ...dom, hook };
}

function press(key: string, shiftKey = false) {
    act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));
    });
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('useLandingMobileMenu', () => {
    it('starts closed', () => {
        const { hook } = renderMenu();
        expect(hook.result.current.isOpen).toBe(false);
    });

    it('moves focus to the first menu item on open', () => {
        const { hook, first } = renderMenu();
        act(() => hook.result.current.toggle());
        expect(hook.result.current.isOpen).toBe(true);
        expect(document.activeElement).toBe(first);
    });

    it('wraps Tab from the last item back to the first', () => {
        const { hook, first, last } = renderMenu();
        act(() => hook.result.current.toggle());
        act(() => last.focus());
        press('Tab');
        expect(document.activeElement).toBe(first);
    });

    it('wraps Shift+Tab from the first item to the last', () => {
        const { hook, first, last } = renderMenu();
        act(() => hook.result.current.toggle());
        act(() => first.focus());
        press('Tab', true);
        expect(document.activeElement).toBe(last);
    });

    it('pulls focus back in when it escapes to a background control', () => {
        const { hook, first, outside } = renderMenu();
        act(() => hook.result.current.toggle());
        act(() => outside.focus());
        press('Tab');
        expect(document.activeElement).toBe(first);
    });

    it('closes on Escape and restores focus to the toggle', () => {
        const { hook, toggle } = renderMenu();
        act(() => hook.result.current.toggle());
        press('Escape');
        expect(hook.result.current.isOpen).toBe(false);
        expect(document.activeElement).toBe(toggle);
    });

    it('closes on an outside pointer press without stealing focus back', () => {
        const { hook, outside } = renderMenu();
        act(() => hook.result.current.toggle());
        act(() => {
            outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        });
        expect(hook.result.current.isOpen).toBe(false);
        expect(document.activeElement).not.toBe(document.getElementById('toggle'));
    });

    it('leaves focus alone when a menu link closes it', () => {
        const { hook, toggle, first } = renderMenu();
        act(() => hook.result.current.toggle());
        act(() => first.focus());
        act(() => hook.result.current.close());
        expect(hook.result.current.isOpen).toBe(false);
        expect(document.activeElement).not.toBe(toggle);
    });

    it('stops trapping Tab once closed', () => {
        const { hook, outside } = renderMenu();
        act(() => hook.result.current.toggle());
        press('Escape');
        act(() => outside.focus());
        press('Tab');
        expect(document.activeElement).toBe(outside);
    });
});
