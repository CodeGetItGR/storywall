'use client';

import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react';

import type { EventDetailResponseDto, EventThemeDto } from '@/lib/api/types';
import type { FeedPageBackdrop } from '@/lib/feedPageBackdrop';
import {
    type FeedPageTheme,
    feedPageTheme,
    feedPageThemeFor,
    type FeedPageThemeSlot,
    feedPageThemeSnapshot,
    publishFeedPageTheme,
    serverFeedPageThemeSnapshot,
    subscribeFeedPageTheme,
} from '@/lib/feedPageTheme';

// Publishes what the page should draw for this event while the caller is on screen. Layout effects, so the
// page's colour changes before the browser paints.
function usePublishFeedPageTheme(slot: FeedPageThemeSlot, eventId: string, value: FeedPageTheme | null) {
    useLayoutEffect(() => {
        publishFeedPageTheme(slot, value ? { eventId, value } : null);
    }, [slot, eventId, value]);
    useLayoutEffect(() => () => publishFeedPageTheme(slot, null), [slot, eventId]);
}

// The page's override for this event, or null: the event's own theme.
export function useFeedPageThemeOverride(eventId: string | null): FeedPageTheme | null {
    const current = useSyncExternalStore(subscribeFeedPageTheme, feedPageThemeSnapshot, serverFeedPageThemeSnapshot);
    return feedPageThemeFor(current, eventId);
}

// The feed: its saved background colour, or its Save my date theme's backdrop, reaches the page. Returns the event
// the cover draws, which shows edit mode's held preset while one is held.
export function useFeedPageTheme(event: EventDetailResponseDto, pageBackground: string | null, backdrop: FeedPageBackdrop | null = null): EventDetailResponseDto {
    const value = useMemo(
        () => (pageBackground || backdrop ? feedPageTheme(event.theme, pageBackground, backdrop) : null),
        [event.theme, pageBackground, backdrop],
    );
    usePublishFeedPageTheme('feed', event.id, value);
    const override = useFeedPageThemeOverride(event.id);
    return useMemo(() => (override ? { ...event, theme: override.theme } : event), [event, override]);
}

// Edit mode: the held wall preset, background colour and theme backdrop reach the page and the cover.
export function useEditPageTheme(eventId: string, wallTheme: EventThemeDto | null, background: string | undefined, backdrop: FeedPageBackdrop | null = null) {
    const value = useMemo(() => feedPageTheme(wallTheme, background, backdrop), [wallTheme, background, backdrop]);
    usePublishFeedPageTheme('edit', eventId, value);
}
