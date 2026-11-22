import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { eventKeys } from '@/hooks/useEvent';
import type { EventDetailResponseDto, FeedLayoutDto } from '@/lib/api/types';
import { defaultFeedLayout, feedLayoutKeys } from '@/lib/feedLayout';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import { FeedEditorFlagProvider } from '@/providers/FeedEditorFlagProvider';

import { FeedPageContent } from './FeedPageContent';
import { FeedPageProvider } from './FeedPageContext';

const rsvpVisible = vi.hoisted(() => ({ value: false }));
const api = vi.hoisted(() => ({ put: vi.fn() }));

vi.mock('@/lib/api/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api/client')>();
    return { ...actual, api: { ...actual.api, put: api.put } };
});
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => '/events/e-1/feed',
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/usePlanUpgradeHref', () => ({ usePlanUpgradeHref: () => '/events/e-1/manage?tab=billing' }));

// The banner wiring and the layout's frame are under test: every other section is stubbed out.
vi.mock('@/hooks/useModuleCopy', () => {
    const copy = (moduleKey: string) => ({ name: moduleKey, description: `${moduleKey} description`, cardLabel: moduleKey, Icon: () => null });
    return {
        useModuleCopy: () => copy,
        useActiveModuleCopy: copy,
        useModuleCopyResolver: () => (_eventType: unknown, moduleKey: string) => copy(moduleKey),
    };
});
vi.mock('@/components/feed/Banner', () => ({
    Banner: ({ illustrationUrl, onIllustrationError }: { illustrationUrl?: string | null; onIllustrationError?: () => void }) => (
        <button data-testid="banner" data-illustration={illustrationUrl ?? ''} onClick={onIllustrationError} />
    ),
}));
// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));
// The translator also answers `has`, which the Settings labels ask before reading a key.
vi.mock('next-intl', () => ({
    useTranslations: () => Object.assign((key: string) => key, { has: () => false, rich: (key: string) => key }),
    useLocale: () => 'en',
}));
vi.mock('@/hooks/useGiftAccount', () => ({ useGiftAccount: () => ({ isLoading: true, data: undefined }) }));
vi.mock('@/hooks/useHideMobileTabBarOnScroll', () => ({ useHideMobileTabBarOnScroll: () => undefined }));
vi.mock('@/hooks/useRsvpPromptVisible', () => ({ useRsvpPromptVisible: () => rsvpVisible.value }));
vi.mock('@/components/feed/ComposerCard', () => ({ ComposerCard: () => null }));
vi.mock('@/components/feed/EventDescription', () => ({
    EventDescription: ({ keepShown }: { keepShown?: boolean }) => <div data-testid="description" data-keep-shown={String(Boolean(keepShown))} />,
}));
vi.mock('@/components/feed/EventInfoSection', () => ({ EventInfoSection: () => null }));
vi.mock('@/components/feed/EventSessionActionButtons', () => ({ EventSessionActionButtons: () => null }));
vi.mock('@/components/feed/FeedEmptyState', () => ({ FeedEmptyState: () => null }));
vi.mock('@/components/feed/FeedPostRenderer', () => ({ FeedPostRenderer: () => null }));
vi.mock('@/components/feed/Header', () => ({ Header: () => null }));
vi.mock('@/components/feed/PostModal', () => ({ PostModal: () => null }));
vi.mock('@/components/feed/PublishQueueCards', () => ({ PublishQueueCards: () => null }));
vi.mock('@/components/feed/RsvpPrompt', () => ({ RsvpPrompt: () => <div data-testid="rsvp" /> }));
vi.mock('@/hooks/useAdminInvitationThemes', () => ({ useInvitationFonts: () => ({ data: [] }) }));
vi.mock('@/components/feed/StoriesRow', () => ({ StoriesRow: () => null }));
vi.mock('@/components/pwa/InstallAppBanner', () => ({ InstallAppBanner: () => null }));
vi.mock('@/components/story/StoryModal', () => ({ StoryModal: () => null }));
vi.mock('@/components/vendors/VendorProfilePrompt', () => ({ VendorProfilePrompt: () => null }));
vi.mock('@/components/feed/quickActions/FeedQuickActions', () => ({ FeedQuickActions: () => null }));

// jsdom has no matchMedia; the edit sheet asks whether the screen is desktop-wide.
window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

afterEach(cleanup);
afterEach(() => {
    rsvpVisible.value = false;
});

function savedLayout(...extra: InvitationSection[]): FeedLayoutDto {
    const base = defaultFeedLayout();
    return {
        themeSlug: null,
        revision: 1,
        document: { ...base, sections: [...base.sections, ...extra] },
        design: null,
        imageUrls: {},
        updatedAt: '2026-11-21T10:00:00Z',
    };
}

const dressCode = SAMPLE_SECTIONS.dressCode as InvitationSection;

type FeedOptions = {
    description?: string | null;
    endAt?: string | null;
    layout?: FeedLayoutDto | null;
    flag?: boolean;
    isHost?: boolean;
    modules?: { moduleKey: string; isAvailable: boolean; isEnabled: boolean }[];
};

function renderFeed(illustrationUrl: string | null, { description = null, endAt = null, layout, flag = false, isHost = false, modules = [] }: FeedOptions = {}) {
    // staleTime: the seeded layout counts as fresh, so nothing is fetched for real.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    if (layout !== undefined) queryClient.setQueryData(feedLayoutKeys.detail('e-1'), layout);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const event = {
        id: 'e-1',
        title: 'Baptism',
        status: 'ACTIVE',
        eventType: 'WEDDING',
        hosts: [],
        partnerBrandingPrompt: null,
        modules,
        coverMedia: null,
        description,
        theme: illustrationUrl ? { presetKey: 'dino', backgroundColor: '#aabbcc', illustrationUrl } : null,
        schedule: { startAt: null, endAt, rsvpDeadline: null },
        location: { name: null, address: null },
    } as unknown as EventDetailResponseDto;
    const value = {
        event,
        eventId: 'e-1',
        currentMemberRsvpId: null,
        isFetchingNextPage: false,
        isHost,
        loadMoreRef: { current: null },
        loadingMoreLabel: '',
        moduleFlags: { rsvp: false, stories: false, posts: false, wishlist: false },
        posts: [],
    } as unknown as Parameters<typeof FeedPageProvider>[0]['value'];
    const wrap = (children: ReactNode) => (
        <QueryClientProvider client={queryClient}>
            <FeedEditorFlagProvider enabled={flag}>
                <FeedPageProvider value={value}>{children}</FeedPageProvider>
            </FeedEditorFlagProvider>
        </QueryClientProvider>
    );
    return { invalidate, ...render(wrap(<FeedPageContent />)) };
}

describe('FeedPageContent theme illustration', () => {
    it('passes the theme illustration to the banner', () => {
        renderFeed('https://media.example/dino.webp');
        expect(screen.getByTestId('banner').dataset.illustration).toBe('https://media.example/dino.webp');
    });

    it('refetches the event detail once when the illustration fails to load', () => {
        const { invalidate } = renderFeed('https://media.example/dino.webp');
        fireEvent.click(screen.getByTestId('banner'));
        fireEvent.click(screen.getByTestId('banner'));
        expect(invalidate).toHaveBeenCalledTimes(1);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: eventKeys.detail('e-1') });
    });

    it('does nothing for an error without an illustration', () => {
        const { invalidate } = renderFeed(null);
        fireEvent.click(screen.getByTestId('banner'));
        expect(invalidate).not.toHaveBeenCalled();
    });
});

// The look loads lazily; with the whole suite running at once it can take more than a second.
const LAZY_LOOK = { timeout: 10_000 };

describe('FeedPageContent layout', { timeout: 15_000 }, () => {
    it('keeps a lone description open on the default layout', () => {
        renderFeed(null, { description: 'Hello', flag: true, layout: null });
        // Alone, it keeps today's rule: it hides itself after two views.
        expect(screen.getByTestId('description').dataset.keepShown).toBe('false');
        expect(screen.queryByRole('button', { name: 'invitation' })).toBeNull();
    });

    it('folds two or more blocks into the Invitation row, which opens in place', async () => {
        renderFeed(null, { description: 'Hello', flag: true, layout: savedLayout(dressCode) });
        const row = await screen.findByRole('button', { name: 'invitation' }, LAZY_LOOK);
        expect(screen.queryByTestId('description')).toBeNull();
        expect(row.getAttribute('aria-expanded')).toBe('false');
        fireEvent.click(row);
        // Inside the fold it always shows: the fold keeps it out of the way instead.
        expect(screen.getByTestId('description').dataset.keepShown).toBe('true');
        expect(row.getAttribute('aria-expanded')).toBe('true');
    });

    it('keeps RSVP outside the fold', async () => {
        rsvpVisible.value = true;
        renderFeed(null, { description: 'Hello', flag: true, layout: savedLayout(dressCode) });
        expect(await screen.findByTestId('rsvp', {}, LAZY_LOOK)).toBeTruthy();
        expect(screen.queryByTestId('description')).toBeNull();
    });

    it('draws only the cover and details after the event', async () => {
        rsvpVisible.value = true;
        renderFeed(null, { description: 'Hello', endAt: '2020-01-01T00:00:00Z', flag: true, layout: savedLayout(dressCode) });
        // The look loads lazily; the cover shows once it has.
        expect(await screen.findByTestId('banner', {}, LAZY_LOOK)).toBeTruthy();
        expect(screen.queryByTestId('description')).toBeNull();
        expect(screen.queryByRole('button', { name: 'invitation' })).toBeNull();
        expect(screen.queryByTestId('rsvp')).toBeNull();
    });

    it('ignores a saved layout while the flag is off', () => {
        renderFeed(null, { description: 'Hello', flag: false, layout: savedLayout(dressCode) });
        expect(screen.getByTestId('description')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'invitation' })).toBeNull();
    });
});

// The edit code loads lazily, so the first lookup after tapping Edit waits for it.
describe('FeedPageContent edit mode', { timeout: 15_000 }, () => {
    afterEach(() => api.put.mockReset());

    // First in this block: once the edit code is in, later taps never wait for it.
    it('keeps the feed top on screen while the edit code loads', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        expect(screen.getByTestId('banner')).toBeTruthy();
        expect(await screen.findByRole('group', { name: 'sectionNames.feedCover' }, LAZY_LOOK)).toBeTruthy();
    });

    it('moves focus to Cancel in edit mode, and back to Edit after', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        const cancel = await screen.findByRole('button', { name: 'cancel' }, LAZY_LOOK);
        expect(document.activeElement).toBe(cancel);
        fireEvent.click(cancel);
        const edit = await screen.findByRole('button', { name: 'edit' });
        expect(document.activeElement).toBe(edit);
    });

    it('shows Edit to a host only', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true });
        expect(await screen.findByRole('button', { name: 'edit' })).toBeTruthy();
        cleanup();
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: false });
        expect(screen.queryByRole('button', { name: 'edit' })).toBeNull();
    });

    it('lists every block while editing, and Cancel leaves at once with no changes', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(dressCode), isHost: true });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        expect(await screen.findByRole('group', { name: 'sectionNames.feedCover' }, LAZY_LOOK)).toBeTruthy();
        expect(screen.getByRole('group', { name: 'sectionNames.feedRsvp' })).toBeTruthy();
        expect(screen.getByRole('group', { name: `sectionNames.${dressCode.type}` })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
        expect(await screen.findByRole('button', { name: 'edit' })).toBeTruthy();
    });

    it('gives the cover no eye', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        const cover = await screen.findByRole('group', { name: 'sectionNames.feedCover' }, LAZY_LOOK);
        expect(within(cover).queryByRole('button', { name: 'hide' })).toBeNull();
    });

    it('hides a block and saves the layout with its revision', async () => {
        api.put.mockResolvedValue({ revision: 2, updatedAt: '2026-11-22T10:00:00Z' });
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        const rsvp = await screen.findByRole('group', { name: 'sectionNames.feedRsvp' }, LAZY_LOOK);
        fireEvent.click(within(rsvp).getByRole('button', { name: 'hide' }));
        expect(within(rsvp).getByText('hidden')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'save' }));
        await waitFor(() => expect(api.put).toHaveBeenCalledOnce());
        const [, body] = api.put.mock.calls[0];
        expect(body.revision).toBe(1);
        expect(body.document.sections.find((section: InvitationSection) => section.type === 'feedRsvp').visible).toBe(false);
    });

    it('asks before Cancel drops changes', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        const rsvp = await screen.findByRole('group', { name: 'sectionNames.feedRsvp' }, LAZY_LOOK);
        fireEvent.click(within(rsvp).getByRole('button', { name: 'hide' }));
        fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
        expect(await screen.findByText('leaveTitle')).toBeTruthy();
    });

    it('locks Add section without Save my date', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        expect((await screen.findAllByText('locked', {}, LAZY_LOOK)).length).toBeGreaterThan(0);
    });
});
