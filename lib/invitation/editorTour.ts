// The editor's first-time tour (the old editor-tour-runtime.js), limited to the tools the editor has.
// It opens by itself once per browser; the "?" in the top bar starts it again.

export type EditorTourStepId = 'welcome' | 'text' | 'add' | 'preview' | 'sectionTools' | 'publish';

export type EditorTourStep = {
    id: EditorTourStepId;
    // What the step lights up; null keeps the card in the middle with nothing lit.
    target: string | null;
};

// The data-editor-tour mark on the parts the tour points at.
export const EDITOR_TOUR_ATTRIBUTE = 'data-editor-tour';

const marked = (name: string) => `[${EDITOR_TOUR_ATTRIBUTE}="${name}"]`;

export const EDITOR_TOUR_STEPS: readonly EditorTourStep[] = [
    { id: 'welcome', target: null },
    // The first text of the invitation.
    { id: 'text', target: '[data-smd-text]' },
    { id: 'add', target: marked('add') },
    { id: 'preview', target: marked('preview') },
    { id: 'sectionTools', target: null },
    { id: 'publish', target: marked('publish') },
];

// Not tied to a draft: a new invitation doesn't bring the tour back.
export const EDITOR_TOUR_SEEN_KEY = 'storywall:smd-editor-tour:seen:v1';

// Gives the editor a moment to draw before the tour covers it.
export const EDITOR_TOUR_DELAY_MS = 900;

// Phones and narrow tablets keep the card at the bottom, as the old tour did.
export const EDITOR_TOUR_NARROW_MAX = 760;

type TourStorage = Pick<Storage, 'getItem' | 'setItem'>;

// Storage can be missing or throw (private windows, blocked site data); the tour then just doesn't remember.
export function hasSeenEditorTour(storage: TourStorage | null | undefined): boolean {
    try {
        return storage?.getItem(EDITOR_TOUR_SEEN_KEY) === '1';
    } catch {
        return false;
    }
}

export function markEditorTourSeen(storage: TourStorage | null | undefined): void {
    try {
        storage?.setItem(EDITOR_TOUR_SEEN_KEY, '1');
    } catch {
        // Nothing to do: the tour may open again next time.
    }
}

export type TourRect = { left: number; top: number; width: number; height: number };
export type TourViewport = { width: number; height: number };

// Room around the lit part.
export const SPOTLIGHT_PADDING = 8;
const EDGE = 14;
const GAP = 16;

// The lit area: the part plus some room, kept inside the screen.
export function spotlightRect(target: TourRect, viewport: TourViewport, padding = SPOTLIGHT_PADDING): TourRect {
    const left = Math.max(4, target.left - padding);
    const top = Math.max(4, target.top - padding);
    const right = Math.min(viewport.width - 4, target.left + target.width + padding);
    const bottom = Math.min(viewport.height - 4, target.top + target.height + padding);
    return { left, top, width: Math.max(20, right - left), height: Math.max(20, bottom - top) };
}

export type TourCardPlacement =
    // In the middle of the screen.
    | { kind: 'center' }
    // Along the bottom edge (narrow screens).
    | { kind: 'bottom' }
    | { kind: 'beside'; left: number; top: number };

// Where the card goes: beside the lit part where it fits (right, left, below, above), as the old tour placed it.
export function tourCardPlacement(spot: TourRect | null, viewport: TourViewport, card: { width: number; height: number }): TourCardPlacement {
    if (!spot) return { kind: 'center' };
    if (viewport.width <= EDITOR_TOUR_NARROW_MAX) return { kind: 'bottom' };
    const right = spot.left + spot.width;
    const bottom = spot.top + spot.height;
    const spots = [
        { left: right + GAP, top: spot.top },
        { left: spot.left - card.width - GAP, top: spot.top },
        { left: spot.left, top: bottom + GAP },
        { left: spot.left, top: spot.top - card.height - GAP },
    ];
    const fits = (p: { left: number; top: number }) =>
        p.left >= EDGE && p.top >= EDGE && p.left + card.width <= viewport.width - EDGE && p.top + card.height <= viewport.height - EDGE;
    const fit = spots.find(fits);
    if (fit) return { kind: 'beside', ...fit };
    return {
        kind: 'beside',
        left: Math.max(EDGE, Math.min(viewport.width - card.width - EDGE, spot.left)),
        top: Math.max(EDGE, Math.min(viewport.height - card.height - EDGE, bottom + GAP)),
    };
}
