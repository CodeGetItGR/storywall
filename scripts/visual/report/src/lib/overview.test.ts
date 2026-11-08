import { describe, expect, it } from 'vitest';

import { failedEntry, sampleEntries, testManifest } from '../testing/fixture';
import { withMarks } from './marks';
import { buildModel } from './model';
import { areaRows, biggestChanges, failedCount, failedStories } from './overview';

const model = buildModel(testManifest([...sampleEntries, failedEntry]));

describe('overview', () => {
    it('counts each area', () => {
        const [feed, ui] = areaRows(model, withMarks(new Map(), [sampleEntries[0]]));
        expect(feed).toMatchObject({ area: 'Feed', firstStory: 'feed-composer--default', reviewed: 1, total: 3 });
        expect(feed.counts).toEqual({ failed: 0, changed: 3, new: 0, removed: 0 });
        expect(ui).toMatchObject({ area: 'UI', reviewed: 0, total: 2 });
        expect(ui.counts).toEqual({ failed: 1, changed: 0, new: 1, removed: 1 });
    });

    it('lists failed stories', () => {
        expect(failedStories(model).map((story) => story.id)).toEqual(['ui-card--broken']);
        expect(failedStories(model).map(failedCount)).toEqual([1]);
    });

    it('lists the biggest changes, one per story, largest first', () => {
        const big = biggestChanges(model);
        expect(big.map(({ story, entry }) => [story.id, entry.percent])).toEqual([
            ['feed-postcard--default', 3.67],
            ['feed-composer--default', 2],
        ]);
    });

    it('stops at the limit', () => {
        expect(biggestChanges(model, 1)).toHaveLength(1);
    });
});
