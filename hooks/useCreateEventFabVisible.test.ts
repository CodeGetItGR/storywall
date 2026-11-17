import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventFabVisible } from '@/hooks/useCreateEventFabVisible';

type Entry = { target: Element; isIntersecting: boolean };
let observerCallback: ((entries: Entry[]) => void) | null = null;

beforeEach(() => {
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            constructor(callback: (entries: Entry[]) => void) {
                observerCallback = callback;
            }
            observe() {}
            disconnect() {}
        },
    );
    document.body.innerHTML = `
        <a data-hero-create="/events/new?type=wedding" href="#pricing">Plans</a>
        <section data-landing-section="final_cta"></section>`;
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
});

const hero = () => document.querySelector('[data-hero-create]')!;
const finalCta = () => document.querySelector('[data-landing-section="final_cta"]')!;

describe('useCreateEventFabVisible', () => {
    it('hides while the hero button shows', () => {
        const { result } = renderHook(() => useCreateEventFabVisible(true));
        act(() => observerCallback!([{ target: hero(), isIntersecting: true }]));
        expect(result.current.visible).toBe(false);
    });

    it('shows once the hero button has scrolled away, linking where the hero creates', () => {
        const { result } = renderHook(() => useCreateEventFabVisible(true));
        act(() =>
            observerCallback!([
                { target: hero(), isIntersecting: false },
                { target: finalCta(), isIntersecting: false },
            ]),
        );
        expect(result.current.visible).toBe(true);
        expect(result.current.href).toBe('/events/new?type=wedding');
    });

    it('hides at the final call to action', () => {
        const { result } = renderHook(() => useCreateEventFabVisible(true));
        act(() =>
            observerCallback!([
                { target: hero(), isIntersecting: false },
                { target: finalCta(), isIntersecting: true },
            ]),
        );
        expect(result.current.visible).toBe(false);
    });

    it('hides at a final call to action marked for the button', () => {
        document.body.innerHTML = `<a data-hero-create="/events/new" href="#pricing">Plans</a><section data-final-cta></section>`;
        const { result } = renderHook(() => useCreateEventFabVisible(true));
        const final = document.querySelector('[data-final-cta]')!;
        act(() =>
            observerCallback!([
                { target: hero(), isIntersecting: false },
                { target: final, isIntersecting: true },
            ]),
        );
        expect(result.current.visible).toBe(false);
    });

    it('falls back to the plain create page when the hero names none', () => {
        document.body.innerHTML = `<a data-hero-create="" href="#pricing">Plans</a>`;
        const { result } = renderHook(() => useCreateEventFabVisible(true));
        act(() => observerCallback!([{ target: hero(), isIntersecting: false }]));
        expect(result.current).toEqual({ visible: true, href: '/events/new' });
    });

    it('stays hidden on a page with no hero button, or when disabled', () => {
        document.body.innerHTML = '';
        expect(renderHook(() => useCreateEventFabVisible(true)).result.current.visible).toBe(false);
        document.body.innerHTML = `<a data-hero-create="/events/new" href="#pricing">Plans</a>`;
        const disabled = renderHook(() => useCreateEventFabVisible(false));
        act(() => observerCallback?.([{ target: hero(), isIntersecting: false }]));
        expect(disabled.result.current.visible).toBe(false);
    });
});
