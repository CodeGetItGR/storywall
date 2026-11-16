import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ChangeEvent, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useInvitationThemesCatalog } from '@/hooks/useInvitationThemesCatalog';
import type { AdminInvitationThemeDto, AdminInvitationThemeSummaryDto } from '@/lib/adminInvitationThemes';
import messages from '@/messages/en.json';

const server = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: server.get, patch: server.patch },
}));

function summary(overrides: Partial<AdminInvitationThemeSummaryDto>): AdminInvitationThemeSummaryDto {
    return {
        id: 't1',
        eventType: 'WEDDING',
        status: 'ACTIVE',
        name: 'Γάμος',
        slug: 'gamos',
        code: null,
        sortOrder: 0,
        revision: 1,
        cardThumbUrl: null,
        updatedAt: '2026-11-01T10:00:00Z',
        ...overrides,
    };
}

const THEMES = [summary({}), summary({ id: 't2', name: 'Stars', slug: 'stars', eventType: 'BAPTISM', status: 'DRAFT' })];

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <NextIntlClientProvider locale="en" messages={messages}>
                {children}
            </NextIntlClientProvider>
        </QueryClientProvider>
    );
}

function respond() {
    server.get.mockImplementation((path: string) =>
        Promise.resolve(
            path === '/api/admin/platform-event-types'
                ? [
                      { eventTypeKey: 'WEDDING', name: { en: 'Wedding', el: 'Γάμος' } },
                      { eventTypeKey: 'BAPTISM', name: { en: 'Baptism', el: 'Βάπτιση' } },
                  ]
                : THEMES,
        ),
    );
}

afterEach(() => vi.clearAllMocks());

describe('useInvitationThemesCatalog', () => {
    it('labels event types from the registry and filters the list', async () => {
        respond();
        const { result } = renderHook(useInvitationThemesCatalog, { wrapper });
        await waitFor(() => expect(result.current.themes).toHaveLength(2));
        await waitFor(() => expect(result.current.eventTypeLabels).toEqual({ WEDDING: 'Wedding', BAPTISM: 'Baptism' }));
        expect(result.current.eventTypeFilterOptions.map((option) => option.label)).toEqual(['All', 'Wedding', 'Baptism']);
        expect(result.current.createEventTypes.map((option) => option.key)).toEqual(['WEDDING', 'BAPTISM', 'BIRTHDAY', 'BABY_SHOWER', 'GENDER_REVEAL']);

        act(() => result.current.setStatus('DRAFT'));
        expect(result.current.visibleThemes.map((theme) => theme.id)).toEqual(['t2']);
        act(() => result.current.setStatus('ALL'));
        act(() => result.current.handleSearchChange({ currentTarget: { value: 'γαμος' } } as ChangeEvent<HTMLInputElement>));
        expect(result.current.visibleThemes.map((theme) => theme.id)).toEqual(['t1']);
    });

    it('opens a new theme or a copy in the drawer once it is named', async () => {
        respond();
        const { result } = renderHook(useInvitationThemesCatalog, { wrapper });
        await waitFor(() => expect(result.current.themes).toHaveLength(2));

        act(() => result.current.openDrawer('t1'));
        expect(result.current.drawerTitle).toBe('Γάμος');
        act(() => result.current.openDuplicate({ id: 't1', name: 'Γάμος' } as AdminInvitationThemeDto));
        expect(result.current.nameModal).toEqual({ mode: 'duplicate', sourceId: 't1', sourceName: 'Γάμος' });
        act(() => result.current.handleNamed({ id: 'copy' } as AdminInvitationThemeDto));
        expect(result.current.nameModal).toBeNull();
        expect(result.current.drawerThemeId).toBe('copy');
    });

    it('moves themes only within one picked event type, with nothing else hidden', async () => {
        respond();
        server.patch.mockResolvedValue(undefined);
        const { result } = renderHook(useInvitationThemesCatalog, { wrapper });
        await waitFor(() => expect(result.current.themes).toHaveLength(2));
        expect(result.current.canReorder).toBe(false);
        expect(result.current.reorderHint).toBe('Pick one kind to change the order.');

        act(() => result.current.setEventType('WEDDING'));
        expect(result.current.canReorder).toBe(true);
        expect(result.current.reorderHint).toBeUndefined();
        act(() => result.current.setStatus('DRAFT'));
        expect(result.current.canReorder).toBe(false);
        act(() => result.current.setStatus('ALL'));
        act(() => result.current.handleSearchChange({ currentTarget: { value: 'x' } } as ChangeEvent<HTMLInputElement>));
        expect(result.current.canReorder).toBe(false);
    });

    it('drops a theme in its new place at once and saves the sort orders that changed', async () => {
        const wedding = [summary({}), summary({ id: 'w2', name: 'Two', slug: 'two', sortOrder: 1 }), summary({ id: 'w3', name: 'Three', slug: 'three', sortOrder: 2 })];
        server.get.mockImplementation((path: string) => Promise.resolve(path === '/api/admin/platform-event-types' ? [] : wedding));
        server.patch.mockResolvedValue(undefined);
        const { result } = renderHook(useInvitationThemesCatalog, { wrapper });
        await waitFor(() => expect(result.current.themes).toHaveLength(3));
        act(() => result.current.setEventType('WEDDING'));

        act(() => result.current.reorderTheme('w3', 't1'));
        expect(result.current.visibleThemes.map((theme) => theme.id)).toEqual(['w3', 't1', 'w2']);
        await waitFor(() => expect(server.patch).toHaveBeenCalledTimes(3));
        expect(server.patch).toHaveBeenCalledWith('/api/admin/invitation-themes/w3', { sortOrder: 0 });
        expect(server.patch).toHaveBeenCalledWith('/api/admin/invitation-themes/t1', { sortOrder: 1 });
        expect(server.patch).toHaveBeenCalledWith('/api/admin/invitation-themes/w2', { sortOrder: 2 });
    });
});
