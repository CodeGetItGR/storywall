import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOverviewFabRoom } from '@/hooks/useOverviewFabRoom';

const mocks = vi.hoisted(() => ({ pathname: '/events/e1/manage', event: { id: 'e1' } as { id: string } | null }));

vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }));
vi.mock('@/hooks/useOverviewFabEvent', () => ({ useOverviewFabEvent: () => mocks.event }));

describe('useOverviewFabRoom', () => {
    beforeEach(() => {
        mocks.pathname = '/events/e1/manage';
        mocks.event = { id: 'e1' };
    });

    it('keeps room on a host page that shows the button', () => {
        expect(renderHook(() => useOverviewFabRoom()).result.current).toBe(true);
    });

    it('keeps no room when the button does not show', () => {
        mocks.event = null;
        expect(renderHook(() => useOverviewFabRoom()).result.current).toBe(false);
    });

    it('keeps no room on the feed, which has its own', () => {
        mocks.pathname = '/events/e1/feed';
        expect(renderHook(() => useOverviewFabRoom()).result.current).toBe(false);
    });
});
