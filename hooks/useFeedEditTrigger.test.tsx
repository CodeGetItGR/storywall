import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedEditTrigger } from '@/hooks/useFeedEditTrigger';

const mocks = vi.hoisted(() => ({ search: 'edit=blocks', replace: vi.fn(), start: vi.fn() }));

vi.mock('next/navigation', () => ({
    usePathname: () => '/events/e1/feed',
    useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock('@/lib/overlayHistory', () => ({
    replacePageUrl: (url: string) => {
        mocks.replace(url);
        mocks.search = new URL(url, 'http://local').search.slice(1);
    },
}));

beforeEach(() => {
    mocks.search = 'edit=blocks';
    mocks.replace.mockReset();
    mocks.start.mockReset();
});

describe('useFeedEditTrigger', () => {
    it('drops the param, then starts editing', () => {
        const { rerender } = renderHook(() => useFeedEditTrigger({ settled: true, canEdit: true, start: mocks.start }));
        rerender();
        expect(mocks.replace).toHaveBeenCalledWith('/events/e1/feed');
        expect(mocks.start).toHaveBeenCalledOnce();
        // renderHook flushes the re-render inside act, so check the order: the param goes before edit mode starts.
        expect(mocks.replace.mock.invocationCallOrder[0]).toBeLessThan(mocks.start.mock.invocationCallOrder[0]);
    });

    it('waits until the role and the layout are known', () => {
        const { rerender } = renderHook(({ settled }) => useFeedEditTrigger({ settled, canEdit: true, start: mocks.start }), {
            initialProps: { settled: false },
        });
        expect(mocks.replace).not.toHaveBeenCalled();
        rerender({ settled: true });
        expect(mocks.replace).toHaveBeenCalledOnce();
    });

    it('only drops the param for someone who cannot edit', () => {
        const { rerender } = renderHook(() => useFeedEditTrigger({ settled: true, canEdit: false, start: mocks.start }));
        rerender();
        expect(mocks.replace).toHaveBeenCalledWith('/events/e1/feed');
        expect(mocks.start).not.toHaveBeenCalled();
    });

    it('does nothing without the param', () => {
        mocks.search = 'post=p-1';
        renderHook(() => useFeedEditTrigger({ settled: true, canEdit: true, start: mocks.start }));
        expect(mocks.replace).not.toHaveBeenCalled();
        expect(mocks.start).not.toHaveBeenCalled();
    });
});
