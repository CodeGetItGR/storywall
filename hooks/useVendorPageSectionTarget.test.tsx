import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorPageSectionTarget } from './useVendorPageSectionTarget';

const mocks = vi.hoisted(() => ({ section: null as string | null, replacePageUrl: vi.fn() }));

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(mocks.section ? `section=${mocks.section}` : '') }));
vi.mock('@/lib/overlayHistory', () => ({ replacePageUrl: mocks.replacePageUrl }));

function renderTarget(props: Partial<Parameters<typeof useVendorPageSectionTarget>[0]> = {}) {
    const openSneakPeek = vi.fn();
    const result = renderHook((next: Parameters<typeof useVendorPageSectionTarget>[0]) => useVendorPageSectionTarget(next), {
        initialProps: { ready: true, sneakPeekLoading: false, sneakPeekReady: false, openSneakPeek, ...props },
    });
    return { ...result, openSneakPeek };
}

describe('useVendorPageSectionTarget', () => {
    const scrollIntoView = vi.fn();

    beforeEach(() => {
        mocks.replacePageUrl.mockReset();
        scrollIntoView.mockReset();
        window.history.replaceState(null, '', '/events/e1/tools/vendors/me?section=prints');
        document.body.innerHTML =
            '<section id="prints"><h3 id="vendor-prints-title"></h3></section><section><h3 id="vendor-sneak-peek-title"></h3></section>';
        document.querySelectorAll('section').forEach((section) => (section.scrollIntoView = scrollIntoView));
    });
    afterEach(cleanup);

    it('scrolls to the section and drops the param', () => {
        mocks.section = 'prints';
        renderTarget();

        expect(scrollIntoView).toHaveBeenCalledTimes(1);
        expect(mocks.replacePageUrl).toHaveBeenCalledWith('/events/e1/tools/vendors/me');
    });

    it('waits for the page to be ready', () => {
        mocks.section = 'prints';
        const { rerender, openSneakPeek } = renderTarget({ ready: false });
        expect(scrollIntoView).not.toHaveBeenCalled();

        rerender({ ready: true, sneakPeekLoading: false, sneakPeekReady: false, openSneakPeek });
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });

    it('opens the sneak peek sheet once its items load, when one can be posted', () => {
        mocks.section = 'sneakPeek';
        const { rerender, openSneakPeek } = renderTarget({ sneakPeekLoading: true });
        expect(openSneakPeek).not.toHaveBeenCalled();

        rerender({ ready: true, sneakPeekLoading: false, sneakPeekReady: true, openSneakPeek });
        expect(openSneakPeek).toHaveBeenCalledTimes(1);
    });

    it('ignores anything that is not a page section', () => {
        mocks.section = 'schedule';
        renderTarget();

        expect(scrollIntoView).not.toHaveBeenCalled();
        expect(mocks.replacePageUrl).not.toHaveBeenCalled();
    });
});
