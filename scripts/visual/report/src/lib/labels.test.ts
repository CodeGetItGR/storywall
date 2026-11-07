import { describe, expect, it } from 'vitest';

import { testEntry } from '../testing/fixture';
import { altText, captureLabel, entryValue, groupLabels, percentText, shortName } from './labels';

describe('labels', () => {
    it('shows percent with two decimals', () => {
        expect(percentText(3.666)).toBe('3.67%');
        expect(percentText(0.001)).toBe('<0.01%');
    });

    it('names a capture', () => {
        expect(captureLabel({ locale: 'el', width: 'desktop' })).toBe('EL Desktop');
    });

    it('shows percent for a change and the state otherwise', () => {
        expect(entryValue(testEntry('a'))).toBe('3.67%');
        expect(entryValue(testEntry('a', { state: 'new' }))).toBe('New');
    });

    it('shortens a story to its component and name', () => {
        expect(shortName(testEntry('a'))).toBe('PostCard / Default');
    });

    it('keeps the alt text pattern', () => {
        expect(altText(testEntry('a', { locale: 'el' }), 'before')).toBe('Feed/PostCard, Default, Greek, mobile, before');
    });
});

describe('groupLabels', () => {
    const entries = (names: string[], overrides = {}) => names.map((name) => testEntry(name, { name, title: 'Feed/ComposerCard', ...overrides }));

    it('names a color group', () => {
        expect(groupLabels([{ key: 'color-1', kind: 'color', entries: entries(['A', 'B']) }]).get('color-1')).toBe('Color change');
    });

    it('names an exact group from its component and stories', () => {
        expect(groupLabels([{ key: 'same-1', kind: 'exact', entries: entries(['A', 'B']) }]).get('same-1')).toBe('ComposerCard: A, B');
    });

    it('says how many more stories there are', () => {
        expect(groupLabels([{ key: 'same-1', kind: 'exact', entries: entries(['A', 'B', 'C', 'D']) }]).get('same-1')).toBe(
            'ComposerCard: A, B and 2 more',
        );
    });

    it('adds the language and width when two groups read the same', () => {
        const labels = groupLabels([
            { key: 'same-1', kind: 'exact', entries: entries(['A', 'B'], { locale: 'en', width: 'desktop' }) },
            { key: 'same-2', kind: 'exact', entries: entries(['A', 'B'], { locale: 'el', width: 'mobile' }) },
        ]);
        expect(labels.get('same-1')).toBe('ComposerCard, EN Desktop: A, B');
        expect(labels.get('same-2')).toBe('ComposerCard, EL Mobile: A, B');
    });
});
