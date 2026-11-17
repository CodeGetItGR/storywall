// hooks/useManageNav.test.tsx
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useManageNav } from '@/hooks/useManageNav';

const mocks = vi.hoisted(() => ({
    event: null as Record<string, unknown> | null,
    memberId: 'm1',
}));

vi.mock('@/components/routing/EventRouteGate', () => ({
    useEventRouteContext: () => ({ activeEvent: mocks.event, eventId: 'e1', isHost: true }),
}));
vi.mock('@/providers/EventProvider', () => ({ useActiveMember: () => ({ id: mocks.memberId }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { planTiers: [] } }) }));
vi.mock('@/hooks/useGiftSection', () => ({ useGiftSection: () => ({ gift: null, available: false, isLoading: false }) }));

function event(moduleKeys: string[], overrides: Record<string, unknown> = {}) {
    return {
        id: 'e1',
        status: 'ACTIVE',
        deletedAt: null,
        suspended: false,
        eventType: 'BIRTHDAY',
        schedule: { startAt: '2027-06-01T10:00:00Z', endAt: null },
        hosts: [{ memberId: 'm1', displayOrder: 0 }],
        modules: moduleKeys.map((moduleKey) => ({ moduleKey, isEnabled: true, isAvailable: true, configuration: {} })),
        ...overrides,
    };
}

beforeEach(() => {
    mocks.memberId = 'm1';
});

describe('useManageNav', () => {
    it('lists Invitations & QR codes and Vendors among the People on a full event', () => {
        mocks.event = event(['posts', 'rsvp', 'vendors']);
        const { result } = renderHook(() => useManageNav());
        expect(result.current.groups).toEqual([
            { key: 'event', items: ['overview', 'settings', 'billing'] },
            { key: 'people', items: ['rsvp', 'invitationsQr', 'members', 'vendors'] },
        ]);
        expect(result.current.showDanger).toBe(true);
    });

    // A lite event takes no guests: no share links, no members (without co-hosts).
    it('drops the People group on a lite event without vendors', () => {
        mocks.event = event(['gallery']);
        const { result } = renderHook(() => useManageNav());
        expect(result.current.groups).toEqual([{ key: 'event', items: ['overview', 'settings', 'billing'] }]);
    });

    it('hides Danger zone from a co-host', () => {
        mocks.event = event(['posts']);
        mocks.memberId = 'm2';
        expect(renderHook(() => useManageNav()).result.current.showDanger).toBe(false);
    });

    // The event menu hides both entries on a deleted event.
    it('hides Invitations & QR codes and Vendors on a deleted event', () => {
        mocks.event = event(['posts', 'vendors'], { deletedAt: '2027-01-01T00:00:00Z' });
        const { result } = renderHook(() => useManageNav());
        const items = result.current.groups.flatMap((group) => group.items);
        expect(items).not.toContain('invitationsQr');
        expect(items).not.toContain('vendors');
    });
});
