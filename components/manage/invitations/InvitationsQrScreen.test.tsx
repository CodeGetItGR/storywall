import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InvitationsQrScreen } from '@/components/manage/invitations/InvitationsQrScreen';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/tools/ModulePageShell', () => ({ ModulePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
const ctx = vi.hoisted(() => ({ isHost: false }));
vi.mock('@/components/routing/EventRouteGate', () => ({
    useEventRouteContext: () => ({ eventId: 'e1', activeEvent: { id: 'e1', status: 'ACTIVE' }, isHost: ctx.isHost }),
}));
const calls = vi.hoisted(() => ({ stats: [] as unknown[], usage: [] as unknown[], upgrades: [] as unknown[] }));
vi.mock('@/hooks/useQrLinks', () => ({
    useEventQrLinks: () => ({
        data: [{ id: 'q1', targetType: 'EVENT_JOIN', label: 'Table', labelKey: null, publicUrl: 'https://x/q1' }],
        isLoading: false,
    }),
    useEventQrLinkStats: (eventId: string | null) => {
        calls.stats.push(eventId);
        return { data: [], isLoading: false };
    },
}));
vi.mock('@/hooks/useUsage', () => ({
    useEventUsage: (eventId: string | null) => {
        calls.usage.push(eventId);
        return { data: null, isLoading: false };
    },
}));
vi.mock('@/hooks/useBilling', () => ({
    useUpgradeOptions: (_: string | null, enabled: boolean) => {
        calls.upgrades.push(enabled);
        return { data: [], isLoading: false };
    },
}));
vi.mock('@/hooks/useIsPrimaryHost', () => ({ useIsPrimaryHost: () => ctx.isHost }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { planTiers: [] } }) }));
const rows = vi.hoisted(() => ({ canWrite: [] as boolean[] }));
vi.mock('@/components/manage/invitations/QrLinkRow', () => ({
    QrLinkRow: ({ canWrite }: { canWrite: boolean }) => {
        rows.canWrite.push(canWrite);
        return <p>row</p>;
    },
}));
vi.mock('@/components/manage/invitations/ShareLanguageNote', () => ({ ShareLanguageNote: () => null }));

beforeEach(() => {
    calls.stats = [];
    calls.usage = [];
    calls.upgrades = [];
    rows.canWrite = [];
});
afterEach(cleanup);

describe('InvitationsQrScreen for a planner', () => {
    it('shows the links read-only and skips every host-only call', () => {
        ctx.isHost = false;
        render(<InvitationsQrScreen />);
        expect(screen.getByText('row')).toBeTruthy();
        expect(rows.canWrite).toEqual([false]);
        expect(calls.stats.every((id) => id === null)).toBe(true);
        expect(calls.usage.every((id) => id === null)).toBe(true);
        expect(calls.upgrades.every((enabled) => enabled === false)).toBe(true);
        expect(screen.queryByText('qr.readOnly')).toBeNull();
    });

    it('keeps the host screen as it was', () => {
        ctx.isHost = true;
        render(<InvitationsQrScreen />);
        expect(rows.canWrite).toEqual([true]);
        expect(calls.stats).toContain('e1');
        expect(calls.usage).toContain('e1');
        expect(calls.upgrades).toEqual([true]);
    });
});
