// hooks/useSectionMenuScroll.test.tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSectionMenuScroll } from '@/hooks/useSectionMenuScroll';

afterEach(() => {
    document.body.innerHTML = '';
});

describe('useSectionMenuScroll', () => {
    it('scrolls to the menu and focuses its first entry', () => {
        const nav = document.createElement('nav');
        nav.innerHTML = '<a href="/rsvp">RSVP</a><a href="/members">Members</a>';
        document.body.append(nav);
        const scrollIntoView = vi.fn();
        nav.scrollIntoView = scrollIntoView;

        const { result } = renderHook(() => useSectionMenuScroll());
        result.current.menuRef.current = nav;
        act(() => result.current.scrollToMenu());

        expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'start' }));
        expect(document.activeElement).toHaveTextContent('RSVP');
    });

    it('does nothing before the menu is on the page', () => {
        const { result } = renderHook(() => useSectionMenuScroll());
        expect(() => act(() => result.current.scrollToMenu())).not.toThrow();
    });
});
