import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
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

type FeedOptions = { description?: string | null; endAt?: string | null; layout?: FeedLayoutDto | null; flag?: boolean };

function renderFeed(illustrationUrl: string | null, { description = null, endAt = null, layout, flag = false }: FeedOptions = {}) {
    // staleTime: the seeded layout counts as fresh, so nothing is fetched for real.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    if (layout !== undefined) queryClient.setQueryData(feedLayoutKeys.detail('e-1'), layout);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const event = {
        id: 'e-1',
        title: 'Baptism',
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
        isHost: false,
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

describe('FeedPageContent layout', () => {
    it('keeps a lone description open on the default layout', () => {
        renderFeed(null, { description: 'Hello', flag: true, layout: null });
        // Alone, it keeps today's rule: it hides itself after two views.
        expect(screen.getByTestId('description').dataset.keepShown).toBe('false');
        expect(screen.queryByRole('button', { name: 'invitation' })).toBeNull();
    });

    it('folds two or more blocks into the Invitation row, which opens in place', async () => {
        renderFeed(null, { description: 'Hello', flag: true, layout: savedLayout(dressCode) });
        const row = await screen.findByRole('button', { name: 'invitation' });
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
        expect(await screen.findByTestId('rsvp')).toBeTruthy();
        expect(screen.queryByTestId('description')).toBeNull();
    });

    it('draws only the cover and details after the event', async () => {
        rsvpVisible.value = true;
        renderFeed(null, { description: 'Hello', endAt: '2020-01-01T00:00:00Z', flag: true, layout: savedLayout(dressCode) });
        // The look loads lazily; the cover shows once it has.
        expect(await screen.findByTestId('banner')).toBeTruthy();
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
