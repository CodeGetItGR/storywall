import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventStatus } from '@/lib/api/types';

import WishbookPage from './PageClient';

let activeMemberId: string | null = 'm1';
let reportTargetTypes: string[] = ['WISHBOOK_ENTRY'];
let eventStatus: EventStatus = 'ACTIVE';
let deletedAt: string | null = null;
let entries: Array<{ id: string; authorMemberId: string | null; canDelete: boolean }> = [];

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/hooks', () => ({
    useAppConfig: () => ({ data: { reportTargetTypes, modules: [], contentLimits: {} } }),
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));
vi.mock('@/hooks/usePlanUpgradeHref', () => ({ usePlanUpgradeHref: () => '/upgrade' }));
vi.mock('@/hooks/useWishbook', () => ({
    useWishbook: () => ({
        data: {
            pages: [
                {
                    content: entries.map((entry) => ({
                        ...entry,
                        eventId: 'event-1',
                        guestName: 'Guest',
                        message: 'Best wishes',
                        createdAt: '2026-09-30T12:00:00Z',
                    })),
                    page: { totalElements: entries.length },
                },
            ],
        },
        isLoading: false,
        error: null,
        hasNextPage: false,
    }),
    useCreateWishbookEntry: () => ({ isPending: false, mutateAsync: vi.fn(), error: null }),
    useDeleteWishbookEntry: () => ({ isPending: false, mutateAsync: vi.fn() }),
    useWishbookExportDownload: () => ({ download: vi.fn(), isDownloading: false, error: null }),
}));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ id: 'event-1', status: eventStatus, deletedAt, deletionScheduledFor: null }),
    useActiveMember: () => (activeMemberId ? { id: activeMemberId, displayName: 'Me' } : null),
    useIsHost: () => true,
}));
vi.mock('@/components/reports', () => ({
    ReportTargetModal: ({ open, targetType, targetId, eventId }: { open: boolean; targetType: string; targetId: string; eventId: string }) =>
        open ? <div data-testid="report-modal" data-target-type={targetType} data-target-id={targetId} data-event-id={eventId} /> : null,
}));

afterEach(cleanup);

beforeEach(() => {
    activeMemberId = 'm1';
    reportTargetTypes = ['WISHBOOK_ENTRY'];
    eventStatus = 'ACTIVE';
    deletedAt = null;
    entries = [{ id: 'w1', authorMemberId: 'm2', canDelete: true }];
});

describe('Wishbook entry report', () => {
    it("lets a member report another member's wish", async () => {
        render(<WishbookPage />);

        fireEvent.click(screen.getByRole('button', { name: 'reportEntry' }));

        const modal = await screen.findByTestId('report-modal');
        expect(modal.dataset.targetType).toBe('WISHBOOK_ENTRY');
        expect(modal.dataset.targetId).toBe('w1');
        expect(modal.dataset.eventId).toBe('event-1');
    });

    it('lets a member report an authorless wish', () => {
        entries = [{ id: 'w1', authorMemberId: null, canDelete: false }];
        render(<WishbookPage />);

        expect(screen.getByRole('button', { name: 'reportEntry' })).toBeTruthy();
    });

    it('offers no report on your own wish, but keeps delete', () => {
        entries = [{ id: 'w1', authorMemberId: 'm1', canDelete: true }];
        render(<WishbookPage />);

        expect(screen.getByRole('button', { name: 'delete' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'reportEntry' })).toBeNull();
    });

    it('offers no report when /api/config does not list the type', () => {
        reportTargetTypes = [];
        render(<WishbookPage />);

        expect(screen.getByRole('button', { name: 'delete' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'reportEntry' })).toBeNull();
    });

    it('offers no report to non-members', () => {
        activeMemberId = null;
        render(<WishbookPage />);
        expect(screen.queryByRole('button', { name: 'reportEntry' })).toBeNull();
    });

    it('offers the report when the event is read-only', () => {
        activeMemberId = 'm1';
        eventStatus = 'DRAFT';
        render(<WishbookPage />);
        expect(screen.getAllByRole('button', { name: 'reportEntry' }).length).toBeGreaterThan(0);
    });

    it('offers the report on a soft-deleted event, and still lists the entries', () => {
        deletedAt = '2026-09-30T12:00:00Z';
        render(<WishbookPage />);

        expect(screen.getByText('Best wishes')).toBeTruthy();
        expect(screen.getAllByRole('button', { name: 'reportEntry' }).length).toBeGreaterThan(0);
    });

    it('drops the dialog when the entry it was opened for disappears', async () => {
        const { rerender } = render(<WishbookPage />);
        fireEvent.click(screen.getByRole('button', { name: 'reportEntry' }));
        expect(await screen.findByTestId('report-modal')).toBeTruthy();

        entries = [{ id: 'w2', authorMemberId: 'm2', canDelete: false }];
        rerender(<WishbookPage />);

        expect(screen.queryByTestId('report-modal')).toBeNull();
    });
});
