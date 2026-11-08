import { describe, expect, it } from 'vitest';

import { colorGroup, groupedEntries, testManifest } from '../testing/fixture';
import { hashOf, itemFromHash } from './addresses';
import { buildModel } from './model';
import { OVERVIEW } from './reviewOrder';

const model = buildModel(testManifest(groupedEntries, { groups: [colorGroup] }));

describe('addresses', () => {
    it('gives every item an address', () => {
        expect(hashOf({ kind: 'story', id: 'a' })).toBe('a');
        expect(hashOf({ kind: 'group', key: 'color-1' })).toBe('group-color-1');
        expect(hashOf(OVERVIEW)).toBe('overview');
    });

    it('opens a story', () => {
        expect(itemFromHash('#ui-badge--old', model)).toEqual({ kind: 'story', id: 'ui-badge--old' });
    });

    it('opens a group', () => {
        expect(itemFromHash('#group-color-1', model)).toEqual({ kind: 'group', key: 'color-1' });
    });

    it('opens the Overview for anything else', () => {
        expect(itemFromHash('', model)).toEqual(OVERVIEW);
        expect(itemFromHash('#overview', model)).toEqual(OVERVIEW);
        expect(itemFromHash('#nope', model)).toEqual(OVERVIEW);
        expect(itemFromHash('#group-nope', model)).toEqual(OVERVIEW);
        expect(itemFromHash('#%E0%A4%A', model)).toEqual(OVERVIEW);
    });
});
