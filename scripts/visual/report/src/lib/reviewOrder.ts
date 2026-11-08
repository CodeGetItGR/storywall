import type { CaptureState, ReportEntry } from '../../../types';
import { isMarked, type Marks } from './marks';
import type { ReportModel, Story } from './model';

export type ListMode = 'area' | 'change';
export type Item = { kind: 'overview' } | { kind: 'story'; id: string } | { kind: 'group'; key: string };
export type Filters = { states: ReadonlySet<CaptureState>; search: string; hideReviewed: boolean };

export type BarActions = {
    start: { item: Item; started: boolean } | null;
    mark: 'looks-right' | 'undo' | null;
    approve: 'link' | 'blocked' | null;
};

export const OVERVIEW: Item = { kind: 'overview' };

const storyItem = (story: Story): Item => ({ kind: 'story', id: story.id });

export function entryMatches(entry: ReportEntry, filters: Filters, marks: Marks): boolean {
    if (filters.states.size > 0 && !filters.states.has(entry.state)) return false;
    if (filters.hideReviewed && isMarked(marks, entry)) return false;
    const query = filters.search.trim().toLowerCase();
    return !query || `${entry.title} ${entry.name}`.toLowerCase().includes(query);
}

export const shownStories = (model: ReportModel, filters: Filters, marks: Marks) =>
    model.stories.filter((story) => story.entries.some((entry) => entryMatches(entry, filters, marks)));

export const shownGroups = (model: ReportModel, filters: Filters, marks: Marks) =>
    model.groups.filter((group) => group.entries.some((entry) => entryMatches(entry, filters, marks)));

export const storiesOnTheirOwn = (model: ReportModel, filters: Filters, marks: Marks) =>
    model.stories.filter((story) =>
        story.entries.some((entry) => entryMatches(entry, filters, marks) && !model.groupByKey.has(entry.changeKey ?? '')),
    );

// What next and previous walk through, in the order the list shows it.
export function reviewQueue(model: ReportModel, mode: ListMode, filters: Filters, marks: Marks): Item[] {
    if (mode === 'area') return shownStories(model, filters, marks).map(storyItem);
    const groups = shownGroups(model, filters, marks).map((group): Item => ({ kind: 'group', key: group.key }));
    return [...groups, ...storiesOnTheirOwn(model, filters, marks).map(storyItem)];
}

export function sameItem(a: Item, b: Item): boolean {
    if (a.kind === 'story' && b.kind === 'story') return a.id === b.id;
    if (a.kind === 'group' && b.kind === 'group') return a.key === b.key;
    return a.kind === b.kind;
}

export const currentIndex = (queue: Item[], item: Item) => queue.findIndex((candidate) => sameItem(candidate, item));

export function itemEntries(model: ReportModel, item: Item): ReportEntry[] {
    if (item.kind === 'story') return model.storyById.get(item.id)?.entries ?? [];
    if (item.kind === 'group') return model.groupByKey.get(item.key)?.entries ?? [];
    return [];
}

// A failed capture has nothing to look at, so it can't be marked. It has to be fixed.
export const reviewable = (entries: ReportEntry[]) => entries.filter((entry) => entry.state !== 'failed');

export function allReviewed(entries: ReportEntry[], marks: Marks): boolean {
    const list = reviewable(entries);
    return list.length > 0 && list.every((entry) => isMarked(marks, entry));
}

export function reviewProgress({ manifest }: ReportModel, marks: Marks) {
    const list = reviewable(manifest.entries);
    return { done: list.filter((entry) => isMarked(marks, entry)).length, total: list.length };
}

export function firstOpenItem(model: ReportModel, queue: Item[], marks: Marks): Item | null {
    const open = queue.find((item) => {
        const entries = itemEntries(model, item);
        return reviewable(entries).length > 0 && !allReviewed(entries, marks);
    });
    return open ?? queue[0] ?? null;
}

function approveAction({ manifest }: ReportModel, marks: Marks): BarActions['approve'] {
    const list = reviewable(manifest.entries);
    if (manifest.entries.length === 0 || !list.every((entry) => isMarked(marks, entry))) return null;
    if (list.length < manifest.entries.length) return 'blocked';
    return manifest.pull ? 'link' : null;
}

// What the bottom bar offers. Approving from the page (KAN-159) would change this.
export function barActions(model: ReportModel, item: Item, queue: Item[], marks: Marks): BarActions {
    const approve = approveAction(model, marks);
    if (item.kind === 'overview') {
        const first = approve === null ? firstOpenItem(model, queue, marks) : null;
        const { done } = reviewProgress(model, marks);
        return { start: first && { item: first, started: done > 0 }, mark: null, approve };
    }
    const entries = reviewable(itemEntries(model, item));
    if (entries.length === 0) return { start: null, mark: null, approve };
    return { start: null, mark: allReviewed(entries, marks) ? 'undo' : 'looks-right', approve };
}
