import type { EventThemeDto } from '@/lib/api/types';
import { lightTone, MIN_INK_CONTRAST } from '@/lib/contrast';
import { FEED_CARD_LIGHTEN, feedBackdropSurface, type FeedPageBackdrop } from '@/lib/feedPageBackdrop';
import type { PhotoTone } from '@/lib/invitation/photoContrast';
import { contrastOn, type PageTone, pageToneOf } from '@/lib/pageTone';

// What the event pages draw while the feed overrides the event's wall theme: the feed's background colour
// (overrides.backgroundColor), a Save my date theme's backdrop, and in edit mode a held wall preset.
// theme null: no theme, today's look. tone: the colours of the text on a page ink can't be read on; cardColor: the
// light tone the post cards sit on there.
export type FeedPageTheme = { theme: EventThemeDto | null; backdrop?: FeedPageBackdrop; tone?: PageTone; cardColor?: string };

// The theme a background colour sits on when the event has none: the colour alone.
const NO_THEME: EventThemeDto = { presetKey: '', backgroundColor: '#FFFFFF', illustrationUrl: '', titleColor: null, headingFont: null };

export function feedPageTheme(wall: EventThemeDto | null, background: string | null | undefined, backdrop?: FeedPageBackdrop | null): FeedPageTheme {
    // The host's own colour wins over the theme's background.
    if (!background && backdrop) {
        return { ...onSurface(wall, backdrop.color, feedBackdropSurface(backdrop)), backdrop, cardColor: backdrop.cardColor };
    }
    if (!background) return { theme: wall };
    const page = onSurface(wall, background, background);
    return page.tone ? { ...page, cardColor: lightTone(background, FEED_CARD_LIGHTEN) } : page;
}

function onSurface(wall: EventThemeDto | null, backgroundColor: string, surface: PhotoTone | string | null): FeedPageTheme {
    const base = wall ?? NO_THEME;
    // A title colour that can't be read on the page falls back to the page's text (null: --event-title is left unset).
    const titleColor = base.titleColor && contrastOn(surface ?? backgroundColor, base.titleColor) >= MIN_INK_CONTRAST ? base.titleColor : null;
    const tone = pageToneOf(surface);
    return { theme: { ...base, backgroundColor, titleColor }, ...(tone && { tone }) };
}

// The feed page publishes its override ('feed'); edit mode publishes the one it previews ('edit'), which wins.
export type FeedPageThemeSlot = 'feed' | 'edit';
type Published = { eventId: string; value: FeedPageTheme };
type Snapshot = Readonly<Partial<Record<FeedPageThemeSlot, Published>>>;

const EMPTY: Snapshot = {};
let snapshot: Snapshot = EMPTY;
const listeners = new Set<() => void>();

export function publishFeedPageTheme(slot: FeedPageThemeSlot, published: Published | null): void {
    if (JSON.stringify(snapshot[slot] ?? null) === JSON.stringify(published)) return;
    snapshot = { ...snapshot, [slot]: published ?? undefined };
    listeners.forEach((listener) => listener());
}

export function subscribeFeedPageTheme(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function feedPageThemeSnapshot(): Snapshot {
    return snapshot;
}

// Nothing is published while the server renders.
export function serverFeedPageThemeSnapshot(): Snapshot {
    return EMPTY;
}

// The override for this event, edit mode's first; null when neither is about it.
export function feedPageThemeFor(current: Snapshot, eventId: string | null): FeedPageTheme | null {
    if (!eventId) return null;
    if (current.edit?.eventId === eventId) return current.edit.value;
    if (current.feed?.eventId === eventId) return current.feed.value;
    return null;
}
