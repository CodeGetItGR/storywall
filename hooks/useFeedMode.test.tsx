import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedMode } from '@/hooks/useFeedMode';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { storedFeedModePick } from '@/lib/feedModeStore';
import { FeedEditorFlagProvider } from '@/providers/FeedEditorFlagProvider';

const nav = vi.hoisted(() => ({ search: '' }));
const history = vi.hoisted(() => ({ replacePageUrl: vi.fn() }));
vi.mock('next/navigation', () => ({
    usePathname: () => '/events/e-1/feed',
    useSearchParams: () => new URLSearchParams(nav.search),
}));
vi.mock('@/lib/overlayHistory', () => history);

const SMD = [{ moduleKey: 'save_my_date', isAvailable: true, isEnabled: true }];
const event = (modules = SMD) =>
    ({ id: 'e-1', modules, schedule: { startAt: '2026-12-20T15:00:00Z', timezone: 'Europe/Athens' }, sessions: [] }) as unknown as EventDetailResponseDto;
const wrapper = ({ children }: { children: ReactNode }) => <FeedEditorFlagProvider enabled>{children}</FeedEditorFlagProvider>;

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-01T10:00:00Z'));
});
afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
    nav.search = '';
    history.replacePageUrl.mockReset();
});

describe('useFeedMode', () => {
    it('opens Invitation before the event day', () => {
        const { result } = renderHook(() => useFeedMode(event()), { wrapper });
        expect(result.current).toMatchObject({ available: true, mode: 'invitation' });
    });

    it('switches, remembers the pick and keeps ?view= in step, without a router call', () => {
        const { result } = renderHook(() => useFeedMode(event()), { wrapper });
        act(() => result.current.select('feed'));
        expect(result.current.mode).toBe('feed');
        expect(storedFeedModePick('e-1')).toBe('{"mode":"feed","savedDay":"2026-12-01"}');
        expect(history.replacePageUrl).toHaveBeenCalledWith('/events/e-1/feed?view=feed');
    });

    it('opens the mode a link asks for and saves it as the pick', () => {
        nav.search = 'view=feed';
        const { result } = renderHook(() => useFeedMode(event()), { wrapper });
        expect(result.current.mode).toBe('feed');
        expect(storedFeedModePick('e-1')).toBe('{"mode":"feed","savedDay":"2026-12-01"}');
    });

    it('has no switch without Save my date, and ignores the param', () => {
        nav.search = 'view=feed';
        const { result } = renderHook(() => useFeedMode(event([])), { wrapper });
        expect(result.current).toMatchObject({ available: false, mode: null });
        expect(storedFeedModePick('e-1')).toBeNull();
    });
});
