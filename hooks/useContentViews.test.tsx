import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));
const provider = vi.hoisted(() => ({ member: { id: 'g1' } as { id: string } | null, isHost: false, event: { id: 'e1' } }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveMember: () => provider.member,
    useIsHost: () => provider.isHost,
    useActiveEvent: () => provider.event,
}));

// The queue is module state: a fresh module per test.
async function load() {
    vi.resetModules();
    return import('@/hooks/useContentViews');
}

function hide() {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
}

describe('useContentViews', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        api.post.mockReset().mockResolvedValue(undefined);
        provider.member = { id: 'g1' };
        provider.isHost = false;
    });
    afterEach(() => {
        vi.useRealTimers();
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    });

    it('flushes every 10 seconds', async () => {
        const { useContentViews } = await load();
        const { result } = renderHook(() => useContentViews());
        result.current('e1', 'post', 'p1');
        expect(api.post).not.toHaveBeenCalled();
        vi.advanceTimersByTime(10_000);
        expect(api.post).toHaveBeenCalledWith('/api/events/e1/views', { mediaIds: [], postIds: ['p1'] }, { keepalive: false });
    });

    it('flushes with keepalive when the page hides', async () => {
        const { useContentViews } = await load();
        const { result } = renderHook(() => useContentViews());
        result.current('e1', 'media', 'm1');
        hide();
        expect(api.post).toHaveBeenCalledWith('/api/events/e1/views', { mediaIds: ['m1'], postIds: [] }, { keepalive: true });
    });

    it('records a shown Pro item of someone else, never for a host', async () => {
        const { useRecordProMediaView } = await load();
        const pro = { id: 'm1', collection: 'PRO', uploaderMemberId: 'v1' } as never;
        renderHook(() => useRecordProMediaView(pro));
        vi.advanceTimersByTime(10_000);
        expect(api.post).toHaveBeenCalledWith('/api/events/e1/views', { mediaIds: ['m1'], postIds: [] }, { keepalive: false });

        api.post.mockClear();
        provider.isHost = true;
        const fresh = await load();
        renderHook(() => fresh.useRecordProMediaView(pro));
        vi.advanceTimersByTime(10_000);
        expect(api.post).not.toHaveBeenCalled();
    });
});
