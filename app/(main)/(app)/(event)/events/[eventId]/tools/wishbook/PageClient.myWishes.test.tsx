import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventStatus } from '@/lib/api/types';

import WishbookPage from './PageClient';

let isHost = false;
let eventStatus: EventStatus = 'ACTIVE';
const useWishbookArgs: Array<string | null> = [];
const useMyWishesArgs: Array<string | null> = [];
const mine = [
    {
        id: 'w1',
        eventId: 'event-1',
        authorMemberId: 'm1',
        guestName: 'Me',
        message: 'My own wish',
        createdAt: '2026-11-16T10:00:00Z',
        canDelete: true,
        highlighted: null,
    },
];

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
vi.mock('next/navigation', () => ({ usePathname: () => '/events/event-1', useRouter: () => ({ back: vi.fn() }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { reportTargetTypes: [], modules: [], contentLimits: {} } }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));
vi.mock('@/hooks/usePlanUpgradeHref', () => ({ usePlanUpgradeHref: () => '/upgrade' }));
vi.mock('@/hooks/useWishbook', () => ({
    useWishbook: (eventId: string | null) => {
        useWishbookArgs.push(eventId);
        return { data: undefined, isLoading: false, error: null, hasNextPage: false };
    },
    useMyWishes: (eventId: string | null) => {
        useMyWishesArgs.push(eventId);
        return {
            data: { pages: [{ content: mine, page: { totalElements: 1 } }] },
            isLoading: false,
            error: null,
            hasNextPage: false,
            isFetchingNextPage: false,
        };
    },
    useCreateWishbookEntry: () => ({ isPending: false, mutateAsync: vi.fn(), error: null }),
    useDeleteWishbookEntry: () => ({ isPending: false, mutateAsync: vi.fn() }),
    useEditWishbookEntry: () => ({ isPending: false, mutateAsync: vi.fn(), error: null, reset: vi.fn() }),
}));
vi.mock('@/hooks/useWishbookBook', () => ({ useSetWishHighlighted: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock('@/components/wishbook/WishbookBookPanel', () => ({ WISHBOOK_BOOK_ID: 'wishbook-book', WishbookBookPanel: () => null }));
// A full event: the page is not a lite event's home.
vi.mock('@/hooks/useLiteHome', () => ({ useLiteHome: () => ({ isHome: false }) }));
vi.mock('@/hooks/useContentAccess', () => ({ useContentAccess: () => ({ isDemoBuilder: false, isLocked: () => false }) }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ id: 'event-1', status: eventStatus, deletedAt: null, deletionScheduledFor: null }),
    useActiveMember: () => ({ id: 'm1', displayName: 'Me' }),
    useIsHost: () => isHost,
    useContentAccessMode: () => 'standard',
}));
vi.mock('@/components/reports/ReportTargetModal', () => ({ ReportTargetModal: () => null }));

afterEach(cleanup);
beforeEach(() => {
    isHost = false;
    eventStatus = 'ACTIVE';
    useWishbookArgs.length = 0;
    useMyWishesArgs.length = 0;
});

describe('Wishbook for a guest', () => {
    it('never asks for the hosts’ list', () => {
        render(<WishbookPage />);
        expect(useWishbookArgs.every((arg) => arg === null)).toBe(true);
    });

    it('shows the guest’s own wishes and opens one for editing', () => {
        render(<WishbookPage />);

        expect(screen.getByRole('heading', { name: 'myWishesTitle' })).toBeTruthy();
        expect(screen.queryByRole('dialog', { name: 'editTitle' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /edit/ }));

        // The open sheet hides the page behind it, so its textarea is the only one left.
        const sheet = screen.getByRole('dialog', { name: 'editTitle' });
        expect((within(sheet).getByRole('textbox', { name: 'messageAriaLabel' }) as HTMLTextAreaElement).value).toBe('My own wish');
    });

    it('keeps the wishes read-only once the event stops taking changes', () => {
        eventStatus = 'DRAFT';
        render(<WishbookPage />);

        expect(screen.getByText('My own wish')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /edit/ })).toBeNull();
    });
});

describe('Wishbook for a host', () => {
    it('reads the hosts’ list and not an own list', () => {
        isHost = true;
        render(<WishbookPage />);

        expect(useWishbookArgs).toContain('event-1');
        expect(useMyWishesArgs.every((arg) => arg === null)).toBe(true);
        expect(screen.queryByRole('heading', { name: 'myWishesTitle' })).toBeNull();
    });
});
