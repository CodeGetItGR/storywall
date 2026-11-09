import type { ChangeGroup, ReportEntry } from '../../../types';
import type { ReportManifest } from '../lib/model';

export function testEntry(id: string, overrides: Partial<ReportEntry> = {}): ReportEntry {
    return {
        id,
        storyId: 'feed-postcard--default',
        title: 'Feed/PostCard',
        name: 'Default',
        locale: 'en',
        width: 'mobile',
        state: 'changed',
        beforeHash: `before-${id}`,
        afterHash: `after-${id}`,
        percent: 3.67,
        error: null,
        changeKey: null,
        images: { before: `img/${id}-before.webp`, after: `img/${id}-after.webp`, diff: `img/${id}-diff.webp` },
        ...overrides,
    };
}

export function testManifest(entries: ReportEntry[], extra: Partial<ReportManifest> = {}): ReportManifest {
    const counts = { changed: 0, new: 0, removed: 0, failed: 0 };
    for (const entry of entries) counts[entry.state] += 1;
    return {
        headSha: 'a'.repeat(40),
        baseSha: 'b'.repeat(40),
        totalCaptures: 1078,
        counts,
        fingerprint: 'c'.repeat(64),
        entries,
        groups: [],
        missingStories: [],
        pull: { number: 263, url: 'https://github.com/CodeGetItGR/storywall/pull/263' },
        ...extra,
    };
}

// Review order by area: Composer, PostCard, Badge, Button.
export const sampleEntries: ReportEntry[] = [
    testEntry('feed-composer--default--en--mobile', { storyId: 'feed-composer--default', title: 'Feed/Composer', percent: 2 }),
    testEntry('feed-postcard--default--en--mobile'),
    testEntry('feed-postcard--default--en--desktop', { width: 'desktop', percent: 1.2 }),
    testEntry('ui-badge--old--en--mobile', {
        storyId: 'ui-badge--old',
        title: 'UI/Badge',
        name: 'Old',
        state: 'removed',
        percent: 100,
        afterHash: null,
        images: { before: 'img/old-before.webp' },
    }),
    testEntry('ui-button--primary--en--mobile', {
        storyId: 'ui-button--primary',
        title: 'UI/Button',
        name: 'Primary',
        state: 'new',
        percent: 100,
        beforeHash: null,
        images: { after: 'img/primary-after.webp' },
    }),
];

export const failedEntry = testEntry('ui-card--broken--en--mobile', {
    storyId: 'ui-card--broken',
    title: 'UI/Card',
    name: 'Broken',
    state: 'failed',
    percent: 0,
    afterHash: null,
    error: 'Boom',
    images: {},
});

export const colorGroup: ChangeGroup = { key: 'color-1', kind: 'color', from: '#241f1a', to: '#7c3aed' };

// The first three captures share one color change.
export const groupedEntries: ReportEntry[] = sampleEntries.map((entry, index) => (index < 3 ? { ...entry, changeKey: colorGroup.key } : entry));
