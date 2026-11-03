import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { capabilitiesOf } from '@/lib/__fixtures__/eventCapabilities';
import type { EventModuleResponseDto } from '@/lib/api/types';

import WishbookPage from './PageClient';

const state = vi.hoisted(() => ({
    modules: [] as EventModuleResponseDto[],
    isHost: true,
    wishCount: 1,
}));

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
// BackButton steps back through the router when the previous page is in the app; the Bundle tabs push.
vi.mock('next/navigation', () => ({ usePathname: () => '/events/event-1/tools/wishbook', useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { reportTargetTypes: [], modules: [], contentLimits: {} } }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));
vi.mock('@/hooks/usePlanUpgradeHref', () => ({ usePlanUpgradeHref: () => '/upgrade' }));
vi.mock('@/hooks/useQrLinks', () => ({ useEventQrLinks: () => ({ data: [] }) }));
vi.mock('@/hooks/useWishbook', () => ({
    useWishbook: () => ({
        data: { pages: [{ content: [], page: { totalElements: state.wishCount } }] },
        isLoading: false,
        error: null,
        hasNextPage: false,
    }),
    useCreateWishbookEntry: () => ({ isPending: false, mutateAsync: vi.fn(), error: null }),
    useDeleteWishbookEntry: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks/useWishbookBook', () => ({ useSetWishHighlighted: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock('@/components/wishbook/WishbookBookPanel', () => ({
    WISHBOOK_BOOK_ID: 'wishbook-book',
    WishbookBookPanel: () => <section id="wishbook-book" data-testid="book-panel" />,
}));
vi.mock('@/components/feed/Banner', () => ({ Banner: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('@/components/liteHome/GuestCodeSheet', () => ({ GuestCodeSheet: () => null }));
vi.mock('@/hooks/useContentAccess', () => ({ useContentAccess: () => ({ isDemoBuilder: false, isLocked: () => false }) }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({
        id: 'event-1',
        title: 'Anna & Nick',
        status: 'ACTIVE',
        deletedAt: null,
        deletionScheduledFor: null,
        modules: state.modules,
        capabilities: capabilitiesOf(state.modules),
    }),
    useActiveMember: () => ({ id: 'm1', displayName: 'Me' }),
    useIsHost: () => state.isHost,
    useContentAccessMode: () => 'standard',
}));

function module_(moduleKey: string, isEnabled: boolean) {
    return { moduleKey, isEnabled, isAvailable: isEnabled } as EventModuleResponseDto;
}

const full = [module_('posts', true), module_('wishbook', true)];
const wishbookOnly = [module_('posts', false), module_('wishbook', true)];
const bundle = [module_('posts', false), module_('gallery', true), module_('wishbook', true)];

beforeEach(() => {
    state.modules = full;
    state.isHost = true;
    state.wishCount = 1;
});

afterEach(cleanup);

describe('Wishbook page as a lite event home', () => {
    it('keeps the back link and module title on a full event', () => {
        render(<WishbookPage />);

        expect(screen.getByRole('link', { name: 'goBack' })).toBeTruthy();
        expect(screen.getByRole('heading', { level: 1, name: 'wishbook' })).toBeTruthy();
        expect(screen.getByText('wishbook description')).toBeTruthy();
        expect(screen.queryByRole('heading', { name: 'actionsTitle' })).toBeNull();
    });

    it('shows the banner and quick actions instead of the back link on a lite event', () => {
        state.modules = wishbookOnly;
        render(<WishbookPage />);

        expect(screen.queryByRole('link', { name: 'goBack' })).toBeNull();
        expect(screen.queryByText('wishbook description')).toBeNull();
        // One h1: the banner's event title.
        expect(screen.getAllByRole('heading', { level: 1 }).map((heading) => heading.textContent)).toEqual(['Anna & Nick']);
        expect(screen.getByRole('heading', { name: 'actionsTitle' })).toBeTruthy();
        expect(screen.getByRole('link', { name: 'actions.upgrade' })).toBeTruthy();
        expect(screen.queryByRole('navigation', { name: 'tabsLabel' })).toBeNull();
    });

    it('shows the Gallery / Wishbook tabs on a Bundle, with the wishbook active', () => {
        state.modules = bundle;
        render(<WishbookPage />);

        const tabs = screen.getByRole('navigation', { name: 'tabsLabel' });
        expect(tabs.textContent).toContain('gallery');
        expect(screen.getByRole('button', { name: 'wishbook' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('scrolls to the book from Download all', () => {
        state.modules = wishbookOnly;
        render(<WishbookPage />);
        const scrollIntoView = vi.fn();
        document.getElementById('wishbook-book')!.scrollIntoView = scrollIntoView;

        fireEvent.click(screen.getByRole('button', { name: 'actions.download' }));

        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });

    it('offers no Download all before there is a wish', () => {
        state.modules = wishbookOnly;
        state.wishCount = 0;
        render(<WishbookPage />);

        expect(screen.queryByRole('button', { name: 'actions.download' })).toBeNull();
    });
});
