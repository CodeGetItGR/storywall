import type { EventThemeDto } from '@/lib/api/types';
import { contrastRatio, MIN_INK_CONTRAST, readableOnInk } from '@/lib/contrast';

// What the event pages draw while the feed overrides the event's wall theme: the feed's background colour
// (overrides.backgroundColor), and in edit mode a held wall preset. theme null: no theme, today's look.
export type FeedPageTheme = { theme: EventThemeDto | null };

// The theme a background colour sits on when the event has none: the colour alone.
const NO_THEME: EventThemeDto = { presetKey: '', backgroundColor: '#FFFFFF', illustrationUrl: '', titleColor: null, headingFont: null };

export function feedPageTheme(wall: EventThemeDto | null, background: string | null | undefined): FeedPageTheme {
    if (!background) return { theme: wall };
    const backgroundColor = readableOnInk(background);
    const base = wall ?? NO_THEME;
    // A title colour that can't be read on the feed's colour falls back to ink (null: --event-title is left unset).
    const titleColor = base.titleColor && contrastRatio(base.titleColor, backgroundColor) >= MIN_INK_CONTRAST ? base.titleColor : null;
    return { theme: { ...base, backgroundColor, titleColor } };
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
