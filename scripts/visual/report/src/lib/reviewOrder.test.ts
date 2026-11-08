import { describe, expect, it } from 'vitest';

import { colorGroup, failedEntry, groupedEntries, sampleEntries, testManifest } from '../testing/fixture';
import { withMarks } from './marks';
import { buildModel } from './model';
import {
    allReviewed,
    barActions,
    currentIndex,
    entryMatches,
    type Filters,
    firstOpenItem,
    type Item,
    OVERVIEW,
    reviewable,
    reviewProgress,
    reviewQueue,
    sameItem,
} from './reviewOrder';

const none: Filters = { states: new Set(), search: '', hideReviewed: false };
const noMarks = new Map<string, string>();
const story = (id: string): Item => ({ kind: 'story', id });

describe('reviewQueue', () => {
    const model = buildModel(testManifest(sampleEntries));
    const grouped = buildModel(testManifest(groupedEntries, { groups: [colorGroup] }));

    it('lists stories by area', () => {
        expect(reviewQueue(model, 'area', none, noMarks).map((item) => item.kind === 'story' && item.id)).toEqual([
            'feed-composer--default',
            'feed-postcard--default',
            'ui-badge--old',
            'ui-button--primary',
        ]);
    });

    it('lists groups first, then stories on their own', () => {
        expect(reviewQueue(grouped, 'change', none, noMarks)).toEqual([
            { kind: 'group', key: 'color-1' },
            story('ui-badge--old'),
            story('ui-button--primary'),
        ]);
    });

    it('narrows by state', () => {
        const queue = reviewQueue(model, 'area', { ...none, states: new Set(['new']) }, noMarks);
        expect(queue).toEqual([story('ui-button--primary')]);
    });

    it('narrows by search, in any case, across title and name', () => {
        expect(reviewQueue(model, 'area', { ...none, search: ' BUTTON ' }, noMarks)).toEqual([story('ui-button--primary')]);
        expect(reviewQueue(model, 'area', { ...none, search: 'old' }, noMarks)).toEqual([story('ui-badge--old')]);
    });

    it('hides reviewed captures', () => {
        const marks = withMarks(noMarks, [sampleEntries[0]]);
        const queue = reviewQueue(model, 'area', { ...none, hideReviewed: true }, marks);
        expect(queue).not.toContainEqual(story('feed-composer--default'));
    });

    it('hides a group when no capture in it matches', () => {
        expect(reviewQueue(grouped, 'change', { ...none, states: new Set(['new']) }, noMarks)).toEqual([story('ui-button--primary')]);
    });
});

describe('entryMatches', () => {
    it('matches everything with no filters', () => {
        expect(entryMatches(sampleEntries[0], none, noMarks)).toBe(true);
    });
});

describe('reviewing', () => {
    const entries = [...sampleEntries, failedEntry];
    const model = buildModel(testManifest(entries));

    it('never counts a failed capture', () => {
        expect(reviewable(entries)).not.toContain(failedEntry);
        expect(reviewProgress(model, noMarks)).toEqual({ done: 0, total: 5 });
    });

    it('has nothing reviewed in a failed-only story', () => {
        expect(allReviewed([failedEntry], noMarks)).toBe(false);
    });

    it('finds the first item not yet reviewed', () => {
        const queue = reviewQueue(model, 'area', none, noMarks);
        expect(firstOpenItem(model, queue, noMarks)).toEqual(story('feed-composer--default'));
        expect(firstOpenItem(model, queue, withMarks(noMarks, [sampleEntries[0]]))).toEqual(story('feed-postcard--default'));
    });

    it('finds items', () => {
        expect(sameItem(story('a'), story('a'))).toBe(true);
        expect(sameItem(story('a'), story('b'))).toBe(false);
        expect(sameItem(OVERVIEW, OVERVIEW)).toBe(true);
        expect(currentIndex([story('a'), story('b')], story('b'))).toBe(1);
        expect(currentIndex([story('a')], OVERVIEW)).toBe(-1);
    });
});

describe('barActions', () => {
    const clean = buildModel(testManifest(sampleEntries));
    const queue = reviewQueue(clean, 'area', none, noMarks);
    const everything = withMarks(noMarks, sampleEntries);

    it('offers Start review on the Overview', () => {
        const actions = barActions(clean, OVERVIEW, queue, noMarks);
        expect(actions.start).toEqual({ item: story('feed-composer--default'), started: false });
        expect(actions.mark).toBeNull();
    });

    it('offers Continue review once something is marked', () => {
        const actions = barActions(clean, OVERVIEW, queue, withMarks(noMarks, [sampleEntries[0]]));
        expect(actions.start?.started).toBe(true);
    });

    it('offers Looks right, then Undo', () => {
        const item = story('feed-composer--default');
        expect(barActions(clean, item, queue, noMarks).mark).toBe('looks-right');
        expect(barActions(clean, item, queue, withMarks(noMarks, [sampleEntries[0]])).mark).toBe('undo');
    });

    it('offers the approve link when everything is reviewed', () => {
        expect(barActions(clean, OVERVIEW, queue, everything)).toMatchObject({ approve: 'link', start: null });
        expect(barActions(clean, story('ui-badge--old'), queue, everything)).toMatchObject({ approve: 'link', mark: 'undo' });
    });

    it('blocks approval while a story failed', () => {
        const model = buildModel(testManifest([...sampleEntries, failedEntry]));
        expect(barActions(model, OVERVIEW, queue, everything).approve).toBe('blocked');
        expect(barActions(model, story('ui-card--broken'), queue, everything).mark).toBeNull();
    });

    it('hides the approve link on a local run', () => {
        const local = buildModel(testManifest(sampleEntries, { pull: undefined }));
        expect(barActions(local, OVERVIEW, queue, everything).approve).toBeNull();
    });

    it('offers nothing on an empty report', () => {
        const empty = buildModel(testManifest([]));
        expect(barActions(empty, OVERVIEW, [], noMarks)).toEqual({ start: null, mark: null, approve: null });
    });
});
