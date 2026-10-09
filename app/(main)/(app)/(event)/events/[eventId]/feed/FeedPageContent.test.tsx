import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { eventKeys } from '@/hooks/useEvent';
import type { EventDetailResponseDto } from '@/lib/api/types';

import { FeedPageContent } from './FeedPageContent';
import { FeedPageProvider } from './FeedPageContext';

// Only the banner wiring is under test: every other section is stubbed out.
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
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks', () => ({
    useGiftAccount: () => ({ isLoading: true, data: undefined }),
    useHideMobileTabBarOnScroll: () => undefined,
}));
vi.mock('@/components/feed/ComposerCard', () => ({ ComposerCard: () => null }));
vi.mock('@/components/feed/EventDescription', () => ({ EventDescription: () => null }));
vi.mock('@/components/feed/EventInfo', () => ({ EventInfo: () => null }));
vi.mock('@/components/feed/EventSessionActionButtons', () => ({ EventSessionActionButtons: () => null }));
vi.mock('@/components/feed/FeedEmptyState', () => ({ FeedEmptyState: () => null }));
vi.mock('@/components/feed/FeedPostRenderer', () => ({ FeedPostRenderer: () => null }));
vi.mock('@/components/feed/Header', () => ({ Header: () => null }));
vi.mock('@/components/feed/PostModal', () => ({ PostModal: () => null }));
vi.mock('@/components/feed/PublishQueueCards', () => ({ PublishQueueCards: () => null }));
vi.mock('@/components/feed/RsvpPrompt', () => ({ RsvpPrompt: () => null }));
vi.mock('@/components/feed/StoriesRow', () => ({ StoriesRow: () => null }));
vi.mock('@/components/story/StoryModal', () => ({ StoryModal: () => null }));

afterEach(cleanup);

function renderFeed(illustrationUrl: string | null) {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const event = {
        id: 'e-1',
        title: 'Baptism',
        coverMedia: null,
        description: null,
        theme: illustrationUrl ? { presetKey: 'dino', backgroundColor: '#aabbcc', illustrationUrl } : null,
        schedule: { startAt: null, rsvpDeadline: null },
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
            <FeedPageProvider value={value}>{children}</FeedPageProvider>
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
