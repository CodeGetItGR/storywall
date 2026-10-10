import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventStatus } from '@/lib/api/types';

import WishbookPage from './PageClient';

let activeMemberId: string | null = 'm1';
let reportTargetTypes: string[] = ['WISHBOOK_ENTRY'];
let eventStatus: EventStatus = 'ACTIVE';
let deletedAt: string | null = null;
let isDemoBuilder = false;
let isHost = true;
let accessMode: 'standard' | 'demoBuilder' | 'demoVisitor' = 'standard';
const createEntry = vi.fn();
const setHighlighted = vi.fn();
let entries: Array<{ id: string; authorMemberId: string | null; canDelete: boolean; highlighted?: boolean | null }> = [];

vi.mock('@/hooks/useModuleCopy', () => {
    const copy = (moduleKey: string) => ({ name: moduleKey, description: `${moduleKey} description`, cardLabel: moduleKey, Icon: () => null });
    return {
        useModuleCopy: () => copy,
        useActiveModuleCopy: copy,
        useModuleCopyResolver: () => (_eventType: unknown, moduleKey: string) => copy(moduleKey),
    };
});
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('next/image', () => ({ default: () => null }));
// BackButton steps back through the router when the previous page is in the app.
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }));
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
                        highlighted: false,
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
    useCreateWishbookEntry: () => ({ isPending: false, mutateAsync: createEntry, error: null }),
    useDeleteWishbookEntry: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks/useWishbookBook', () => ({ useSetWishHighlighted: () => ({ mutate: setHighlighted, isPending: false }) }));
vi.mock('@/components/wishbook/WishbookBookPanel', () => ({
    WishbookBookPanel: ({ canEditTexts }: { canEditTexts: boolean }) => <div data-testid="book-panel" data-can-edit-texts={String(canEditTexts)} />,
}));
vi.mock('@/hooks/useContentAccess', () => ({ useContentAccess: () => ({ isDemoBuilder, isLocked: () => false }) }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ id: 'event-1', status: eventStatus, deletedAt, deletionScheduledFor: null }),
    useActiveMember: () => (activeMemberId ? { id: activeMemberId, displayName: 'Me' } : null),
    useIsHost: () => isHost,
    useContentAccessMode: () => accessMode,
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
    isDemoBuilder = false;
    isHost = true;
    accessMode = 'standard';
    createEntry.mockReset();
    setHighlighted.mockReset();
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

describe('Wishbook composer for hosts', () => {
    it('stays hidden from a host', () => {
        render(<WishbookPage />);

        expect(screen.queryByRole('textbox', { name: 'messageAriaLabel' })).toBeNull();
    });

    it('lets an admin building a demo write a wish signed by whoever they post as', () => {
        isDemoBuilder = true;
        render(<WishbookPage />);

        fireEvent.change(screen.getByRole('textbox', { name: 'messageAriaLabel' }), { target: { value: 'Congrats!' } });
        fireEvent.click(screen.getByRole('button', { name: 'addToWishbook' }));

        expect(createEntry).toHaveBeenCalledWith({ message: 'Congrats!', guestName: undefined });
    });
});

describe('Wishbook book', () => {
    it('shows the book panel to hosts once there are wishes', () => {
        render(<WishbookPage />);
        expect(screen.getByTestId('book-panel').dataset.canEditTexts).toBe('true');
    });

    it('shows no book panel to a guest, or before there is a wish', () => {
        isHost = false;
        const { unmount } = render(<WishbookPage />);
        expect(screen.queryByTestId('book-panel')).toBeNull();
        unmount();

        isHost = true;
        entries = [];
        render(<WishbookPage />);
        expect(screen.queryByTestId('book-panel')).toBeNull();
    });

    it('shows no book panel in the public demo, where nothing can be built', () => {
        accessMode = 'demoVisitor';
        render(<WishbookPage />);
        expect(screen.queryByTestId('book-panel')).toBeNull();
    });

    it('keeps the book panel for an admin building a demo event', () => {
        accessMode = 'demoBuilder';
        render(<WishbookPage />);
        expect(screen.getByTestId('book-panel')).toBeTruthy();
    });

    it('stars a wish', () => {
        render(<WishbookPage />);
        const star = screen.getByRole('button', { name: 'star' });
        expect(star.getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(star);
        expect(setHighlighted).toHaveBeenCalledWith({ entryId: 'w1', highlighted: true });
    });

    it('removes the star from a starred wish', () => {
        entries = [{ id: 'w1', authorMemberId: 'm2', canDelete: true, highlighted: true }];
        render(<WishbookPage />);
        const star = screen.getByRole('button', { name: 'star' });
        expect(star.getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(star);
        expect(setHighlighted).toHaveBeenCalledWith({ entryId: 'w1', highlighted: false });
    });

    it.each([null, undefined])('offers no star when the wish says %s (not a host, or a demo wish)', (highlighted) => {
        entries = [{ id: 'w1', authorMemberId: 'm2', canDelete: true, highlighted }];
        render(<WishbookPage />);
        expect(screen.queryByRole('button', { name: 'star' })).toBeNull();
    });

    it('hides stars on a deleted event but keeps the panel, with its texts frozen', () => {
        deletedAt = '2026-10-01T00:00:00Z';
        render(<WishbookPage />);
        expect(screen.queryByRole('button', { name: 'star' })).toBeNull();
        expect(screen.getByTestId('book-panel').dataset.canEditTexts).toBe('false');
    });
});
