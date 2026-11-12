import type { CaptureState, ReportEntry } from '../../../types';
import { CAPTURE_ORDER, type CaptureChoice, capturesInOrder } from './captures';
import { type ReportModel, type Story, storyCapture } from './model';
import type { Item, ListMode } from './reviewOrder';

export type CompareMode = 'side' | 'slider' | 'diff';
export type ZoomMode = 'fit' | 'full';

export type ViewState = {
    revealed: Item;
    mode: ListMode;
    states: ReadonlySet<CaptureState>;
    search: string;
    hideReviewed: boolean;
    compare: CompareMode;
    zoom: ZoomMode;
    slider: number;
    capture: CaptureChoice;
    groupEntry: ReadonlyMap<string, string>;
    allThumbs: ReadonlySet<string>;
    expanded: ReadonlySet<string>;
    helpOpen: boolean;
    drawerOpen: boolean;
};

export function toggled<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
    const next = new Set(set);
    if (!next.delete(value)) next.add(value);
    return next;
}

// Only stories with a capture outside every group are listed under Same change.
const inGroupsOnly = (model: ReportModel, story: Story) => story.entries.every((entry) => model.groupByKey.has(entry.changeKey ?? ''));

// The list follows the item, whether it came from a click, a link or the back button.
export function revealItem(view: ViewState, model: ReportModel, item: Item): ViewState {
    const next = { ...view, revealed: item, drawerOpen: false };
    if (item.kind === 'group') return { ...next, mode: 'change' };
    const story = item.kind === 'story' ? model.storyById.get(item.id) : undefined;
    if (!story) return next;
    const expanded = new Set([...view.expanded, story.area, `${story.area}/${story.component}`]);
    return { ...next, expanded, mode: view.mode === 'change' && inGroupsOnly(model, story) ? 'area' : view.mode };
}

export function initialView(model: ReportModel, item: Item): ViewState {
    const start: ViewState = {
        revealed: item,
        mode: 'area',
        states: new Set(),
        search: '',
        hideReviewed: false,
        compare: 'side',
        zoom: 'fit',
        slider: 50,
        capture: CAPTURE_ORDER[0],
        groupEntry: new Map(),
        allThumbs: new Set(),
        expanded: new Set(),
        helpOpen: false,
        drawerOpen: false,
    };
    return revealItem(start, model, item);
}

export function currentEntry(model: ReportModel, item: Item, { capture, groupEntry }: Pick<ViewState, 'capture' | 'groupEntry'>): ReportEntry | null {
    if (item.kind === 'story') {
        const story = model.storyById.get(item.id);
        return story ? storyCapture(story, capture) : null;
    }
    if (item.kind === 'group') {
        const entries = model.groupByKey.get(item.key)?.entries ?? [];
        return entries.find((entry) => entry.id === groupEntry.get(item.key)) ?? entries[0] ?? null;
    }
    return null;
}

export function nextCapture(story: Story, choice: CaptureChoice): CaptureChoice {
    const list = capturesInOrder(story.entries);
    const { locale, width } = list[(list.indexOf(storyCapture(story, choice)) + 1) % list.length];
    return { locale, width };
}

// Outside the list, next goes to the first item and previous does nothing, the same as the bar's buttons.
export function stepTarget(queue: Item[], index: number, delta: 1 | -1): Item | null {
    if (index === -1) return delta > 0 ? (queue[0] ?? null) : null;
    return queue[index + delta] ?? null;
}

// Comparing needs a before and an after image.
export const canCompare = (entry: ReportEntry | null) => entry?.state === 'changed';

// A failed capture has no image to zoom, and the slider always fits.
export const canZoom = (entry: ReportEntry | null, compare: CompareMode) =>
    entry !== null && entry.state !== 'failed' && !(canCompare(entry) && compare === 'slider');

// The zoom the images get. Where zoom is off they fit, so the slider never depends on the CSS order.
export const appliedZoom = (entry: ReportEntry | null, compare: CompareMode, zoom: ZoomMode): ZoomMode => (canZoom(entry, compare) ? zoom : 'fit');
