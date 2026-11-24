import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { eventKeys } from '@/hooks/useEvent';
import type { EventDetailResponseDto, FeedLayoutDto } from '@/lib/api/types';
import { defaultFeedLayout, feedLayoutKeys } from '@/lib/feedLayout';
import { feedPageThemeFor, feedPageThemeSnapshot, publishFeedPageTheme } from '@/lib/feedPageTheme';
import { createFeedModeSection } from '@/lib/feedSections';
import type { InvitationDocument } from '@/lib/invitation/document';
import { SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
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
// Edit mode's theme sheet reads the session for its wall presets; signed out, that list is never fetched.
vi.mock('@/providers/AuthProvider', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/providers/AuthProvider')>()),
    useAuth: () => ({ isAuthenticated: false }),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => '/events/e-1/feed',
    useSearchParams: () => new URLSearchParams(),
}));

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
const tabBar = vi.hoisted(() => ({ away: false }));
vi.mock('@/hooks/useHideMobileTabBar', () => ({
    useHideMobileTabBar: (active: boolean) => {
        tabBar.away = active;
    },
}));
vi.mock('@/hooks/useHideMobileTabBarOnScroll', () => ({ useHideMobileTabBarOnScroll: () => undefined }));
vi.mock('@/hooks/useRsvpPromptVisible', () => ({ useRsvpPromptVisible: () => rsvpVisible.value }));
vi.mock('@/components/feed/ComposerCard', () => ({ ComposerCard: () => null }));
vi.mock('@/components/feed/EventDescription', () => ({
    EventDescription: ({ keepShown }: { keepShown?: boolean }) => <div data-testid="description" data-keep-shown={String(Boolean(keepShown))} />,
}));
vi.mock('@/components/feed/EventSessionActionButtons', () => ({ EventSessionActionButtons: () => null }));
vi.mock('@/components/feed/FeedEmptyState', () => ({ FeedEmptyState: () => null }));
vi.mock('@/components/feed/EventInfoSection', () => ({ EventInfoSection: () => <div data-testid="date-row" /> }));
vi.mock('@/components/feed/FeedPageSkeleton', () => ({ FeedPageSkeleton: () => <div data-testid="skeleton" /> }));
vi.mock('@/components/feed/FeedPostRenderer', () => ({ FeedPostRenderer: () => null }));
vi.mock('@/components/feed/Header', () => ({ Header: () => null }));
vi.mock('@/components/feed/PostModal', () => ({ PostModal: () => null }));
vi.mock('@/components/feed/PublishQueueCards', () => ({ PublishQueueCards: () => null }));
vi.mock('@/components/feed/RsvpPrompt', () => ({ RsvpPrompt: () => <div data-testid="rsvp" /> }));
// One list for every render, as a query gives: a new one each time would rebuild the Add section previews forever.
const fonts = vi.hoisted(() => ({ data: [] }));
vi.mock('@/hooks/useAdminInvitationThemes', () => ({ useInvitationFonts: () => fonts }));
vi.mock('@/components/feed/StoriesRow', () => ({ StoriesRow: () => null }));
vi.mock('@/components/pwa/InstallAppBanner', () => ({ InstallAppBanner: () => null }));
vi.mock('@/components/story/StoryModal', () => ({ StoryModal: () => null }));
vi.mock('@/components/vendors/VendorProfilePrompt', () => ({ VendorProfilePrompt: () => null }));
vi.mock('@/components/feed/guestOffer/GuestOfferCard', () => ({ GuestOfferCard: () => null }));
// The real viewer needs an IntersectionObserver, which jsdom doesn't have.
vi.mock('@/components/feed/post/MediaViewer', () => ({ MediaViewer: () => <div data-testid="photo-viewer" /> }));
vi.mock('@/components/feed/HeOrShePromptCard', () => ({ HeOrShePromptCard: () => <span>fixed card</span> }));
vi.mock('@/components/feed/sections/FeedHeOrSheSection', () => ({ FeedHeOrSheSection: () => <span>section card</span> }));
vi.mock('@/providers/composer/ComposerContext', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/providers/composer/ComposerContext')>()),
    useComposer: () => ({ openPostComposer: vi.fn(), canComposePost: true }),
}));
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
    window.localStorage.clear();
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

// A layout whose host put RSVP above the description.
function rsvpFirstLayout(): FeedLayoutDto {
    const saved = savedLayout(dressCode);
    const document = saved.document as InvitationDocument;
    const [cover, details, description, rsvp, ...rest] = document.sections;
    return { ...saved, document: { ...document, sections: [cover, details, rsvp, description, ...rest] } };
}

function follows(first: HTMLElement, second: HTMLElement): boolean {
    return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}
const SMD = [{ moduleKey: 'save_my_date', isAvailable: true, isEnabled: true }];

const toolsOf = (group: HTMLElement) => within(group.querySelector('[data-feed-block-tools]') as HTMLElement);

// Picks a tool from a block's dropdown.
async function pickTool(group: HTMLElement, tool: string) {
    fireEvent.click(toolsOf(group).getByRole('button', { name: 'sections.options', hidden: true }));
    fireEvent.click(await screen.findByRole('menuitem', { name: tool }));
}

type FeedOptions = {
    description?: string | null;
    endAt?: string | null;
    layout?: FeedLayoutDto | null;
    flag?: boolean;
    isHost?: boolean;
    modules?: { moduleKey: string; isAvailable: boolean; isEnabled: boolean }[];
    stories?: boolean;
    startAt?: string | null;
    posts?: boolean;
};

function renderFeed(
    illustrationUrl: string | null,
    { description = null, endAt = null, layout, flag = false, isHost = false, modules = [], stories = false, startAt = null, posts = false }: FeedOptions = {},
) {
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
        schedule: { startAt, endAt, rsvpDeadline: null, timezone: 'Europe/Athens' },
        sessions: [],
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
        moduleFlags: { rsvp: false, stories, posts, wishlist: false },
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

    it('opens a Save my date event on Invitation before its day: every block, the description always shown', async () => {
        rsvpVisible.value = true;
        renderFeed(null, {
            description: 'Hello',
            flag: true,
            layout: savedLayout(dressCode),
            modules: SMD,
            startAt: '2099-06-01T15:00:00Z',
            stories: true,
        });
        expect(await screen.findByTestId('description', {}, LAZY_LOOK)).toBeTruthy();
        expect(screen.getByTestId('description').dataset.keepShown).toBe('true');
        expect(screen.getByTestId('rsvp')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'invitation' }).getAttribute('aria-pressed')).toBe('true');
        expect(document.querySelector('#stories')).toBeNull();
        expect(document.querySelector('#posts')).toBeNull();
    });

    it('opens on Feed from the event day: stories and posts, no details or RSVP', async () => {
        rsvpVisible.value = true;
        renderFeed(null, {
            description: 'Hello',
            flag: true,
            layout: savedLayout(dressCode),
            modules: SMD,
            startAt: '2020-06-01T15:00:00Z',
            stories: true,
        });
        expect(await screen.findByRole('button', { name: 'socialFeed' }, LAZY_LOOK)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'socialFeed' }).getAttribute('aria-pressed')).toBe('true');
        expect(document.querySelector('#stories')).toBeTruthy();
        expect(document.querySelector('#posts')).toBeTruthy();
        expect(screen.queryByTestId('description')).toBeNull();
        expect(screen.queryByTestId('rsvp')).toBeNull();
    });

    it('switches modes from the pill and remembers the pick', async () => {
        renderFeed(null, { description: 'Hello', flag: true, layout: savedLayout(dressCode), modules: SMD, startAt: '2099-06-01T15:00:00Z' });
        fireEvent.click(await screen.findByRole('button', { name: 'socialFeed' }, LAZY_LOOK));
        expect(screen.getByRole('button', { name: 'socialFeed' }).getAttribute('aria-pressed')).toBe('true');
        expect(window.localStorage.getItem('storywall.feedMode.e-1')).toContain('"mode":"feed"');
    });

    it('keeps the phone tab bar away on Invitation, and its room with it', async () => {
        renderFeed(null, { description: 'Hello', flag: true, layout: savedLayout(dressCode), modules: SMD, startAt: '2099-06-01T15:00:00Z' });
        const socialFeed = await screen.findByRole('button', { name: 'socialFeed' }, LAZY_LOOK);
        expect(tabBar.away).toBe(true);
        expect(document.querySelector('[data-tab-bar-away]')).toBeTruthy();
        fireEvent.click(socialFeed);
        expect(tabBar.away).toBe(false);
        expect(document.querySelector('[data-tab-bar-away]')).toBeNull();
    });

    it('keeps the tab bar on the one page', () => {
        renderFeed(null, { description: 'Hello', flag: true, layout: savedLayout(dressCode) });
        expect(tabBar.away).toBe(false);
    });

    it('shows the date row in Social Feed mode only', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(dressCode), modules: SMD, startAt: '2020-06-01T15:00:00Z' });
        expect(await screen.findByTestId('date-row', {}, LAZY_LOOK)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'invitation' }));
        expect(screen.queryByTestId('date-row')).toBeNull();
    });

    it('has no date row on the one page', () => {
        renderFeed(null, { description: 'Hello', flag: true, layout: savedLayout(dressCode), stories: true });
        expect(document.querySelector('#stories')).toBeTruthy();
        expect(screen.queryByTestId('date-row')).toBeNull();
    });

    it('draws one page without Save my date: no switch, nothing folded', () => {
        renderFeed(null, { description: 'Hello', flag: true, layout: savedLayout(dressCode), stories: true });
        expect(screen.queryByRole('button', { name: 'invitation' })).toBeNull();
        expect(screen.getByTestId('description')).toBeTruthy();
        expect(document.querySelector('#stories')).toBeTruthy();
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
describe('FeedPageContent RSVP place', { timeout: 15_000 }, () => {
    it('draws RSVP where the host put it on a Save my date event', async () => {
        rsvpVisible.value = true;
        renderFeed(null, { description: 'Hello', flag: true, layout: rsvpFirstLayout(), modules: SMD, startAt: '2099-06-01T15:00:00Z' });
        const description = await screen.findByTestId('description', {}, LAZY_LOOK);
        expect(follows(screen.getByTestId('rsvp'), description)).toBe(true);
    });

    it('keeps RSVP last without Save my date', async () => {
        rsvpVisible.value = true;
        renderFeed(null, { description: 'Hello', flag: true, layout: rsvpFirstLayout() });
        const description = await screen.findByTestId('description', {}, LAZY_LOOK);
        expect(follows(description, screen.getByTestId('rsvp'))).toBe(true);
    });
});

describe('FeedPageContent feed sections', { timeout: 15_000 }, () => {
    const prompt = { ...createFeedModeSection('feedPrompt', () => 'p'), data: { text: 'Show us' } } as InvitationSection;
    const heOrShe = createFeedModeSection('feedHeOrShe', () => 'h');
    const pinned = {
        ...createFeedModeSection('feedPinned', () => 'pin'),
        data: { photos: [{ id: 'one', image: { source: 'media', mediaId: 'm-1' } }] },
    } as InvitationSection;
    const withPhoto = { ...savedLayout(pinned), imageUrls: { 'm-1': 'https://media.test/one.jpg' } };

    it('draws them on the one page, after RSVP and above the posts', () => {
        rsvpVisible.value = true;
        renderFeed(null, { flag: true, layout: savedLayout(prompt), posts: true });
        const line = screen.getByText('Show us');
        expect(follows(screen.getByTestId('rsvp'), line)).toBe(true);
        expect(follows(line, document.querySelector('#posts') as HTMLElement)).toBe(true);
    });

    it('draws them in Social Feed mode only, under the stories, with Save my date', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(prompt), modules: SMD, startAt: '2020-06-01T15:00:00Z', stories: true });
        const line = await screen.findByText('Show us', {}, LAZY_LOOK);
        expect(follows(document.querySelector('#stories') as HTMLElement, line)).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'invitation' }));
        expect(screen.queryByText('Show us')).toBeNull();
    });

    it("leaves Save my date's sections out of the one page", () => {
        renderFeed(null, { flag: true, layout: savedLayout(dressCode, prompt) });
        expect(screen.getByText('Show us')).toBeTruthy();
        // Without them the layout needs no invitation look, so the feed draws plainly.
        expect(document.querySelector('.smd-invitation')).toBeNull();
    });

    it('opens a pinned photo full screen from the page, and takes no tap in edit mode', async () => {
        renderFeed(null, { flag: true, layout: withPhoto });
        fireEvent.click(screen.getByRole('button', { name: 'photoAlt' }));
        expect(await screen.findByTestId('photo-viewer')).toBeTruthy();
        cleanup();

        renderFeed(null, { flag: true, layout: withPhoto, isHost: true, modules: SMD, startAt: '2020-06-01T15:00:00Z' });
        expect(await screen.findByRole('button', { name: 'photoAlt' }, LAZY_LOOK)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        const pinned = await screen.findByRole('group', { name: 'sectionNames.feedPinned' }, LAZY_LOOK);
        const photo = within(pinned).getByAltText('photoAlt');
        expect(photo.closest('button')).toBeNull();
        expect(photo.closest('[inert]')).toBeTruthy();
        fireEvent.click(photo);
        expect(screen.queryByTestId('photo-viewer')).toBeNull();
    });

    it('draws the fixed Boy or Girl card only while the layout has no Boy or Girl section, shown or hidden', () => {
        renderFeed(null, { flag: true, layout: savedLayout(), posts: true });
        expect(screen.getByText('fixed card')).toBeTruthy();
        cleanup();

        renderFeed(null, { flag: true, layout: savedLayout({ ...heOrShe, visible: false }), posts: true });
        expect(screen.queryByText('fixed card')).toBeNull();
        expect(screen.queryByText('section card')).toBeNull();
        cleanup();

        renderFeed(null, { flag: true, layout: savedLayout(heOrShe), posts: true });
        expect(screen.getByText('section card')).toBeTruthy();
        expect(screen.queryByText('fixed card')).toBeNull();
    });
});

describe('FeedPageContent edit mode', { timeout: 15_000 }, () => {
    it('lets the host drag and delete RSVP on a Save my date event', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(dressCode), isHost: true, modules: SMD, startAt: '2099-06-01T15:00:00Z' });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        const rsvp = await screen.findByRole('group', { name: 'sectionNames.feedRsvp' }, LAZY_LOOK);
        expect(toolsOf(rsvp).getByRole('button', { name: 'drag' })).toBeTruthy();
        // Its only tool, so no dropdown.
        expect(toolsOf(rsvp).getByRole('button', { name: 'sections.delete' })).toBeTruthy();
        expect(toolsOf(rsvp).queryByRole('button', { name: 'sections.options' })).toBeNull();
    });

    it("asks before RSVP's delete, then adds RSVP back from its tile", async () => {
        const modules = [...SMD, { moduleKey: 'rsvp', isAvailable: true, isEnabled: true }];
        renderFeed(null, { flag: true, layout: savedLayout(dressCode), isHost: true, modules, startAt: '2099-06-01T15:00:00Z' });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        const rsvp = await screen.findByRole('group', { name: 'sectionNames.feedRsvp' }, LAZY_LOOK);
        fireEvent.click(toolsOf(rsvp).getByRole('button', { name: 'sections.delete' }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('deleteBody')).toBeTruthy();
        expect(screen.getByRole('group', { name: 'sectionNames.feedRsvp', hidden: true })).toBeTruthy();
        fireEvent.click(within(dialog).getByRole('button', { name: 'deleteConfirm' }));
        await waitFor(() => expect(screen.queryByRole('group', { name: 'sectionNames.feedRsvp' })).toBeNull());

        const rows = screen.getAllByRole('button', { name: 'add' });
        fireEvent.click(rows[rows.length - 1]);
        fireEvent.click(await screen.findByRole('button', { name: 'rsvp' }));
        expect(await screen.findByRole('group', { name: 'sectionNames.feedRsvp' })).toBeTruthy();
    });

    it('hides the pill while editing, with the edit row under the cover', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(dressCode), isHost: true, modules: SMD, startAt: '2099-06-01T15:00:00Z' });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }, LAZY_LOOK));
        const cancel = await screen.findByRole('button', { name: 'cancel' }, LAZY_LOOK);
        expect(screen.queryByRole('button', { name: 'invitation' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'socialFeed' })).toBeNull();
        const cover = screen.getByRole('group', { name: 'sectionNames.feedCover' });
        expect(cover.contains(cancel)).toBe(false);
    });

    afterEach(() => api.put.mockReset());

    // First in this block: once the edit code is in, later taps never wait for it.
    it('keeps the feed top on screen while the edit code loads', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true, modules: SMD });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        expect(screen.getByTestId('banner')).toBeTruthy();
        expect(await screen.findByRole('group', { name: 'sectionNames.feedCover' }, LAZY_LOOK)).toBeTruthy();
    });

    it('moves focus to Cancel in edit mode, and back to Edit after', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true, modules: SMD });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        const cancel = await screen.findByRole('button', { name: 'cancel' }, LAZY_LOOK);
        expect(document.activeElement).toBe(cancel);
        fireEvent.click(cancel);
        const edit = await screen.findByRole('button', { name: 'edit' });
        expect(document.activeElement).toBe(edit);
    });

    it('shows Edit to a host only', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true, modules: SMD });
        expect(await screen.findByRole('button', { name: 'edit' })).toBeTruthy();
        cleanup();
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: false });
        expect(screen.queryByRole('button', { name: 'edit' })).toBeNull();
    });

    it('edits only the feed sections without Save my date: no Theme, no tools on the fixed blocks', async () => {
        api.put.mockResolvedValue({ revision: 2, updatedAt: '2026-11-22T10:00:00Z' });
        rsvpVisible.value = true;
        const prompt = { ...createFeedModeSection('feedPrompt', () => 'p'), data: { text: 'Show us' } } as InvitationSection;
        renderFeed(null, { description: 'Hello', flag: true, isHost: true, layout: savedLayout(dressCode, prompt), modules: [] });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        expect(document.activeElement).toBe(await screen.findByRole('button', { name: 'cancel' }, LAZY_LOOK));
        expect(screen.queryByRole('button', { name: 'themes' })).toBeNull();

        // The fixed blocks draw as on the feed and take no taps.
        for (const id of ['banner', 'description', 'rsvp']) expect(screen.getByTestId(id).closest('[inert]')).toBeTruthy();
        expect(screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'))).toEqual(['sectionNames.feedPrompt']);

        // One Add section row, for the feed sections.
        fireEvent.click(screen.getByRole('button', { name: 'add' }));
        expect(screen.queryByRole('button', { name: 'sectionNames.faq' })).toBeNull();
        fireEvent.click(await screen.findByRole('button', { name: 'sectionNames.feedPinned' }));
        expect(await screen.findByRole('group', { name: 'sectionNames.feedPinned', hidden: true })).toBeTruthy();

        // Save my date's own sections, out of sight, are saved as they were.
        fireEvent.click(screen.getByRole('button', { name: 'save', hidden: true }));
        await waitFor(() => expect(api.put).toHaveBeenCalledOnce());
        const sections = api.put.mock.calls[0][1].document.sections as InvitationSection[];
        expect(sections).toContainEqual(dressCode);
        expect(sections.map((section) => section.type).slice(-2)).toEqual(['feedPrompt', 'feedPinned']);
    });

    it('says a feed section goes from the feed, not the invitation', async () => {
        const prompt = { ...createFeedModeSection('feedPrompt', () => 'p'), data: { text: 'Show us' } } as InvitationSection;
        renderFeed(null, { flag: true, isHost: true, layout: savedLayout(prompt), modules: [] });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        const group = await screen.findByRole('group', { name: 'sectionNames.feedPrompt' }, LAZY_LOOK);
        await pickTool(group, 'sections.delete');
        expect(within(await screen.findByRole('dialog')).getByText('deleteBodyFeed')).toBeTruthy();
    });

    it('adds no stand-ins for empty fixed blocks without Save my date', async () => {
        renderFeed(null, { flag: true, isHost: true, layout: savedLayout(), modules: [] });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        await screen.findByRole('button', { name: 'cancel' }, LAZY_LOOK);
        expect(screen.queryByText('sectionNames.feedDescription')).toBeNull();
        expect(screen.queryByText('sectionNames.feedRsvp')).toBeNull();
        expect(screen.queryByRole('group')).toBeNull();
    });

    it('lists every block while editing, and Cancel leaves at once with no changes', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(dressCode), isHost: true, modules: SMD });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        expect(await screen.findByRole('group', { name: 'sectionNames.feedCover' }, LAZY_LOOK)).toBeTruthy();
        expect(screen.getByRole('group', { name: 'sectionNames.feedRsvp' })).toBeTruthy();
        expect(screen.getByRole('group', { name: `sectionNames.${dressCode.type}` })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
        expect(await screen.findByRole('button', { name: 'edit' })).toBeTruthy();
    });

    it('names every block but the cover in its tools while editing, and nowhere once done', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(dressCode), isHost: true, modules: SMD });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        await screen.findByRole('group', { name: 'sectionNames.feedCover' }, LAZY_LOOK);
        for (const type of ['feedDescription', dressCode.type, 'feedRsvp']) {
            const group = screen.getByRole('group', { name: `sectionNames.${type}` });
            const tools = group.querySelector('[data-feed-block-tools]') as HTMLElement;
            expect(within(tools).getByText(`sectionNames.${type}`)).toHaveAttribute('aria-hidden', 'true');
        }
        // The details block isn't drawn, so there is nothing to edit.
        expect(screen.queryByRole('group', { name: 'sectionNames.feedDetails' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
        await screen.findByRole('button', { name: 'edit' });
        expect(document.querySelector('[data-feed-block-tools]')).toBeNull();
    });

    it('gives the cover no eye and no name on screen', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true, modules: SMD });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        const cover = await screen.findByRole('group', { name: 'sectionNames.feedCover' }, LAZY_LOOK);
        expect(within(cover).queryByRole('button', { name: 'hide' })).toBeNull();
        expect(within(cover).queryByText('sectionNames.feedCover')).toBeNull();
    });

    it('hides a block and saves the layout with its revision', async () => {
        api.put.mockResolvedValue({ revision: 2, updatedAt: '2026-11-22T10:00:00Z' });
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true, modules: SMD });
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

    it("adds a feed section in Social Feed mode, opens its settings and saves it with the invitation's blocks", async () => {
        api.put.mockResolvedValue({ revision: 2, updatedAt: '2026-11-22T10:00:00Z' });
        renderFeed(null, { flag: true, layout: savedLayout(dressCode), isHost: true, modules: SMD, startAt: '2020-06-01T15:00:00Z' });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }, LAZY_LOOK));
        // One Add section row: the feed sections', never the invitation's.
        const row = await screen.findByRole('button', { name: 'add' }, LAZY_LOOK);
        fireEvent.click(row);
        expect(await screen.findByRole('button', { name: 'sectionNames.feedPinned' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'sectionNames.faq' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'sectionNames.feedPrompt' }));

        const prompt = await screen.findByRole('group', { name: 'sectionNames.feedPrompt', hidden: true });
        await pickTool(prompt, 'sectionSettings.open');
        fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'Show us your shoes' } });
        fireEvent.click(screen.getByRole('button', { name: 'save', hidden: true }));
        await waitFor(() => expect(api.put).toHaveBeenCalledOnce());
        const sections = api.put.mock.calls[0][1].document.sections as InvitationSection[];
        const before = savedLayout(dressCode).document as InvitationDocument;
        expect(sections.map((section) => section.type)).toEqual([...before.sections.map((section) => section.type), 'feedPrompt']);
        expect(sections.at(-1)?.data).toMatchObject({ text: 'Show us your shoes' });
    });

    it('asks before Cancel drops changes', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true, modules: SMD });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        const rsvp = await screen.findByRole('group', { name: 'sectionNames.feedRsvp' }, LAZY_LOOK);
        fireEvent.click(within(rsvp).getByRole('button', { name: 'hide' }));
        fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
        expect(await screen.findByText('leaveTitle')).toBeTruthy();
    });

    it("opens a block's settings when the block is tapped, and moves them to the next block tapped", async () => {
        renderFeed(null, { flag: true, layout: savedLayout(dressCode), isHost: true, modules: SMD });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        const cover = await screen.findByRole('group', { name: 'sectionNames.feedCover' }, LAZY_LOOK);
        fireEvent.click(cover);
        expect(await screen.findByRole('dialog', { name: 'sectionNames.feedCover' })).toBeTruthy();
        fireEvent.click(screen.getByRole('group', { name: `sectionNames.${dressCode.type}` }));
        expect(await screen.findByRole('dialog', { name: `sectionNames.${dressCode.type}` })).toBeTruthy();
        expect(screen.queryByRole('dialog', { name: 'sectionNames.feedCover' })).toBeNull();
        expect(screen.getByRole('group', { name: `sectionNames.${dressCode.type}` })).toHaveAttribute('aria-current', 'true');
        expect(cover).not.toHaveAttribute('aria-current');
    });

    it("keeps the tools from opening the block's settings", async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true, modules: SMD });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        const rsvp = await screen.findByRole('group', { name: 'sectionNames.feedRsvp' }, LAZY_LOOK);
        fireEvent.click(within(rsvp).getByRole('button', { name: 'hide' }));
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});

describe('FeedPageContent on a Save my date theme', { timeout: 15_000 }, () => {
    afterEach(() => publishFeedPageTheme('feed', null));
    const themed: FeedLayoutDto = {
        ...savedLayout(),
        themeSlug: 'olive',
        document: { ...defaultFeedLayout(), themeId: 'olive' },
        design: SAMPLE_THEME,
        imageUrls: { 'm-content': 'https://media.test/content.jpg' },
    };

    it("puts the theme's background behind the whole page", () => {
        renderFeed(null, { flag: true, layout: themed });
        expect(feedPageThemeFor(feedPageThemeSnapshot(), 'e-1')?.backdrop?.image?.desktop).toBe('https://media.test/content.jpg');
    });

    it('draws the stories row on the page wherever the page draws a backdrop, and on its own colour elsewhere', () => {
        const { container } = renderFeed(null, { flag: true, layout: themed, stories: true });
        const row = container.querySelector('#stories')?.className ?? '';
        expect(row).toContain('bg-event/90');
        expect(row).toContain('[.feed-backdrop_&]:bg-transparent');
        expect(row).toContain('[.feed-backdrop_&]:backdrop-blur-none');
    });
});
