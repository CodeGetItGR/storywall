import { describe, expect, it } from 'vitest';

import { testEntry } from '../testing/fixture';
import { altText, captureLabel, componentOf, entryValue, groupLabels, percentText, shortName } from './labels';

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

    it('takes the component from the last part of the title', () => {
        expect(componentOf('Feed/PostCard/')).toBe('PostCard');
        expect(componentOf('Solo')).toBe('Solo');
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

    const acrossComponents = (overrides = {}) => [
        testEntry('a', overrides),
        testEntry('b', { storyId: 'feed-composer--default', title: 'Feed/Composer', ...overrides }),
        testEntry('c', { storyId: 'ui-button--primary', title: 'UI/Button', name: 'Primary', ...overrides }),
    ];

    it('names each story when a group covers more than one component', () => {
        expect(groupLabels([{ key: 'same-1', kind: 'exact', entries: acrossComponents() }]).get('same-1')).toBe(
            'PostCard / Default, Composer / Default and 1 more',
        );
    });

    it('puts the language and width first when two such groups read the same', () => {
        const labels = groupLabels([
            { key: 'same-1', kind: 'exact', entries: acrossComponents({ locale: 'en', width: 'mobile' }) },
            { key: 'same-2', kind: 'exact', entries: acrossComponents({ locale: 'el', width: 'desktop' }) },
        ]);
        expect(labels.get('same-1')).toBe('EN Mobile: PostCard / Default, Composer / Default and 1 more');
        expect(labels.get('same-2')).toBe('EL Desktop: PostCard / Default, Composer / Default and 1 more');
    });

    it('lists the languages and widths in capture order', () => {
        const mixed = [
            testEntry('a-el', { name: 'A', title: 'Feed/ComposerCard', locale: 'el', width: 'mobile' }),
            testEntry('a-en', { name: 'A', title: 'Feed/ComposerCard', locale: 'en', width: 'desktop' }),
        ];
        const labels = groupLabels([
            { key: 'same-1', kind: 'exact', entries: mixed },
            { key: 'same-2', kind: 'exact', entries: entries(['A']) },
        ]);
        expect(labels.get('same-1')).toBe('ComposerCard, EN Desktop, EL Mobile: A');
    });
});
