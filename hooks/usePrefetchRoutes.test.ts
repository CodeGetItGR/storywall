import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePrefetchRoutes } from '@/hooks/usePrefetchRoutes';

const mocks = vi.hoisted(() => ({ prefetch: vi.fn(), pathname: '/events/e1/feed' }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ prefetch: mocks.prefetch }), usePathname: () => mocks.pathname }));

describe('usePrefetchRoutes', () => {
    beforeEach(() => {
        mocks.prefetch.mockReset();
        mocks.pathname = '/events/e1/feed';
    });

    it('prefetches nothing until asked', () => {
        renderHook(() => usePrefetchRoutes(['/events/e1/manage', '/events/e1/tools/gallery']));

        expect(mocks.prefetch).not.toHaveBeenCalled();
    });

    it('prefetches every route when asked', () => {
        const { result } = renderHook(() => usePrefetchRoutes(['/events/e1/manage', '/events/e1/tools/gallery']));

        result.current();

        expect(mocks.prefetch.mock.calls).toEqual([['/events/e1/manage'], ['/events/e1/tools/gallery']]);
    });

    it('prefetches nothing inside the demo', () => {
        mocks.pathname = '/demo/wedding/feed';
        const { result } = renderHook(() => usePrefetchRoutes(['/demo/wedding/manage']));

        result.current();

        expect(mocks.prefetch).not.toHaveBeenCalled();
    });
});
