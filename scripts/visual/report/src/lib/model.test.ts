import { describe, expect, it } from 'vitest';

import { colorGroup, groupedEntries, sampleEntries, testEntry, testManifest } from '../testing/fixture';
import { areaTree, buildModel, largestPercent, storyCapture, worstState } from './model';

describe('buildModel', () => {
    it('makes stories from entries, sorted by area, component and name', () => {
        const model = buildModel(testManifest(sampleEntries));
        expect(model.stories.map((story) => story.id)).toEqual([
            'feed-composer--default',
            'feed-postcard--default',
            'ui-badge--old',
            'ui-button--primary',
        ]);
        expect(model.storyById.get('feed-postcard--default')?.entries).toHaveLength(2);
    });

    it('splits a title into area and component', () => {
        const model = buildModel(testManifest([testEntry('a', { title: 'Feed/Post/Card' }), testEntry('b', { storyId: 'b', title: 'Solo' })]));
        expect(model.storyById.get('feed-postcard--default')).toMatchObject({ area: 'Feed', component: 'Post / Card' });
        expect(model.storyById.get('b')).toMatchObject({ area: 'Solo', component: 'Solo' });
    });

    it('attaches entries to groups, biggest change first', () => {
        const model = buildModel(testManifest(groupedEntries, { groups: [colorGroup] }));
        const group = model.groupByKey.get('color-1');
        expect(group?.entries.map((entry) => entry.percent)).toEqual([3.67, 2, 1.2]);
        expect(group?.label).toBe('Color change');
    });

    it('accepts a manifest from before grouping', () => {
        const entries = sampleEntries.map((entry) => {
            const old: Partial<typeof entry> = { ...entry };
            delete old.changeKey;
            return old as typeof entry;
        });
        const model = buildModel(testManifest(entries, { groups: undefined }));
        expect(model.groups).toEqual([]);
        expect(model.manifest.entries.map((entry) => entry.changeKey)).toEqual(entries.map(() => null));
        expect(model.stories.flatMap((story) => story.entries).every((entry) => entry.changeKey === null)).toBe(true);
    });

    it('drops a group with fewer than two captures', () => {
        const model = buildModel(testManifest([testEntry('a', { changeKey: 'color-1' })], { groups: [colorGroup] }));
        expect(model.groups).toEqual([]);
    });

    it('puts the largest group first', () => {
        const entries = [
            testEntry('a', { changeKey: 'same-1' }),
            testEntry('b', { changeKey: 'same-1' }),
            testEntry('c', { changeKey: 'same-2' }),
            testEntry('d', { changeKey: 'same-2' }),
            testEntry('e', { changeKey: 'same-2' }),
        ];
        const groups = [
            { key: 'same-1', kind: 'exact' as const },
            { key: 'same-2', kind: 'exact' as const },
        ];
        expect(buildModel(testManifest(entries, { groups })).groups.map((group) => group.key)).toEqual(['same-2', 'same-1']);
    });

    it("names a group's stories in area order, whatever their percents", () => {
        const entries = [
            testEntry('zeta', { storyId: 'feed-composercard--zeta', title: 'Feed/ComposerCard', name: 'Zeta', percent: 9, changeKey: 'same-1' }),
            testEntry('alpha', { storyId: 'feed-composercard--alpha', title: 'Feed/ComposerCard', name: 'Alpha', percent: 1, changeKey: 'same-1' }),
        ];
        const group = buildModel(testManifest(entries, { groups: [{ key: 'same-1', kind: 'exact' }] })).groups[0];
        expect(group.label).toBe('ComposerCard: Alpha, Zeta');
        expect(group.entries.map((entry) => entry.id)).toEqual(['zeta', 'alpha']);
    });

    it('breaks a tie in percent by id', () => {
        const entries = ['b', 'a', 'B'].map((id) => testEntry(id, { changeKey: 'color-1', percent: 2 }));
        const group = buildModel(testManifest(entries, { groups: [colorGroup] })).groupByKey.get('color-1');
        expect(group?.entries.map((entry) => entry.id)).toEqual(['B', 'a', 'b']);
    });
});

describe('stories', () => {
    const postCard = buildModel(testManifest(sampleEntries)).storyById.get('feed-postcard--default');

    it('shows the worst state', () => {
        expect(worstState([testEntry('a', { state: 'new' }), testEntry('b', { state: 'failed' })])).toBe('failed');
    });

    it('keeps the chosen capture, or falls back to the first', () => {
        expect(storyCapture(postCard!, { locale: 'en', width: 'desktop' }).width).toBe('desktop');
        expect(storyCapture(postCard!, { locale: 'el', width: 'desktop' }).width).toBe('mobile');
    });

    it('finds the largest percent among changes only', () => {
        expect(largestPercent(postCard!)).toBe(3.67);
        expect(largestPercent({ ...postCard!, entries: [testEntry('a', { state: 'new', percent: 100 })] })).toBeNull();
    });

    it('builds the area tree', () => {
        const tree = areaTree(buildModel(testManifest(sampleEntries)).stories);
        expect(tree.map((branch) => [branch.area, branch.count])).toEqual([
            ['Feed', 2],
            ['UI', 2],
        ]);
        expect(tree[0].components.map((branch) => branch.key)).toEqual(['Feed/Composer', 'Feed/PostCard']);
    });
});
