import { describe, expect, it } from 'vitest';

import { colorGroup, groupedEntries, sampleEntries, testEntry, testManifest } from '../testing/fixture';
import { buildModel } from './model';
import { type Item, OVERVIEW } from './reviewOrder';
import { currentEntry, initialView, nextCapture, revealItem, stepTarget, toggled } from './viewState';

const model = buildModel(testManifest(groupedEntries, { groups: [colorGroup] }));
const story = (id: string): Item => ({ kind: 'story', id });

describe('revealItem', () => {
    it('opens the rows around a story', () => {
        const view = revealItem(initialView(model, OVERVIEW), model, story('feed-postcard--default'));
        expect(view.expanded.has('Feed')).toBe(true);
        expect(view.expanded.has('Feed/PostCard')).toBe(true);
    });

    it('switches to the list that holds a group', () => {
        expect(revealItem(initialView(model, OVERVIEW), model, { kind: 'group', key: 'color-1' }).mode).toBe('change');
    });

    it('moves to the area list for a story listed only in groups', () => {
        const inChange = { ...initialView(model, OVERVIEW), mode: 'change' as const };
        expect(revealItem(inChange, model, story('feed-postcard--default')).mode).toBe('area');
    });

    it('stays on the same-change list for a story listed on its own', () => {
        const inChange = { ...initialView(model, OVERVIEW), mode: 'change' as const };
        expect(revealItem(inChange, model, story('ui-badge--old')).mode).toBe('change');
    });

    it('keeps open rows open', () => {
        const view = { ...initialView(model, OVERVIEW), expanded: new Set(['UI']) };
        expect(revealItem(view, model, story('feed-postcard--default')).expanded.has('UI')).toBe(true);
    });

    it('closes the drawer and remembers the item', () => {
        const item = story('ui-badge--old');
        const view = revealItem({ ...initialView(model, OVERVIEW), drawerOpen: true }, model, item);
        expect(view.drawerOpen).toBe(false);
        expect(view.revealed).toBe(item);
    });
});

describe('initialView', () => {
    it('starts by area with the first capture chosen', () => {
        expect(initialView(model, OVERVIEW)).toMatchObject({
            mode: 'area',
            compare: 'side',
            zoom: 'fit',
            slider: 50,
            capture: { locale: 'en', width: 'mobile' },
        });
    });

    it('reveals a story opened from a link', () => {
        expect(initialView(model, story('ui-badge--old')).expanded.has('UI')).toBe(true);
        expect(initialView(model, story('ui-badge--old')).expanded.has('UI/Badge')).toBe(true);
    });
});

describe('toggled', () => {
    it('adds and removes without changing the original', () => {
        const start = new Set(['a']);
        expect([...toggled(start, 'b')]).toEqual(['a', 'b']);
        expect([...toggled(start, 'a')]).toEqual([]);
        expect([...start]).toEqual(['a']);
    });
});

describe('nextCapture', () => {
    const postCard = buildModel(testManifest(sampleEntries)).storyById.get('feed-postcard--default')!;

    it('steps from the capture shown when the chosen one is missing', () => {
        expect(nextCapture(postCard, { locale: 'el', width: 'desktop' })).toEqual({ locale: 'en', width: 'desktop' });
    });

    it('moves to the next capture and wraps', () => {
        expect(nextCapture(postCard, { locale: 'en', width: 'mobile' })).toEqual({ locale: 'en', width: 'desktop' });
        expect(nextCapture(postCard, { locale: 'en', width: 'desktop' })).toEqual({ locale: 'en', width: 'mobile' });
    });
});

describe('stepTarget', () => {
    const queue = [story('a'), story('b')];

    it('moves within the queue', () => {
        expect(stepTarget(queue, 0, 1)).toEqual(story('b'));
        expect(stepTarget(queue, 1, -1)).toEqual(story('a'));
    });

    it('stops at the ends', () => {
        expect(stepTarget(queue, 1, 1)).toBeNull();
        expect(stepTarget(queue, 0, -1)).toBeNull();
    });

    it('enters the queue from outside it', () => {
        expect(stepTarget(queue, -1, 1)).toEqual(story('a'));
        expect(stepTarget(queue, -1, -1)).toEqual(story('b'));
    });

    it('has nowhere to go in an empty queue', () => {
        expect(stepTarget([], -1, 1)).toBeNull();
    });
});

describe('currentEntry', () => {
    const view = initialView(model, OVERVIEW);

    it('has none on the Overview', () => {
        expect(currentEntry(model, OVERVIEW, view)).toBeNull();
    });

    it('uses the chosen capture on a story', () => {
        const chosen = { ...view, capture: { locale: 'en' as const, width: 'desktop' as const } };
        expect(currentEntry(model, story('feed-postcard--default'), chosen)?.width).toBe('desktop');
    });

    it('starts a group on its biggest change', () => {
        expect(currentEntry(model, { kind: 'group', key: 'color-1' }, view)?.percent).toBe(3.67);
    });

    it('shows the capture picked in a group', () => {
        const id = testEntry('feed-composer--default--en--mobile').id;
        const picked = { ...view, groupEntry: new Map([['color-1', id]]) };
        expect(currentEntry(model, { kind: 'group', key: 'color-1' }, picked)?.id).toBe(id);
    });
});
