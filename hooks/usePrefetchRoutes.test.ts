import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePrefetchRoutes } from '@/hooks/usePrefetchRoutes';

const mocks = vi.hoisted(() => ({ prefetch: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ prefetch: mocks.prefetch }) }));

describe('usePrefetchRoutes', () => {
    beforeEach(() => mocks.prefetch.mockReset());

    it('prefetches nothing until asked', () => {
        renderHook(() => usePrefetchRoutes(['/events/e1/manage', '/events/e1/tools/gallery']));

        expect(mocks.prefetch).not.toHaveBeenCalled();
    });

    it('prefetches every route when asked', () => {
        const { result } = renderHook(() => usePrefetchRoutes(['/events/e1/manage', '/events/e1/tools/gallery']));

        result.current();

        expect(mocks.prefetch.mock.calls).toEqual([['/events/e1/manage'], ['/events/e1/tools/gallery']]);
    });
});
