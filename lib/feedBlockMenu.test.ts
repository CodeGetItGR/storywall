import { describe, expect, it } from 'vitest';

import { feedBlockTools } from '@/lib/feedBlockMenu';

describe('feedBlockTools', () => {
    it('holds settings and delete, in the order drawn', () => {
        expect(feedBlockTools({ hasSettings: true, canDelete: true })).toEqual(['settings', 'delete']);
    });

    it('holds only what the block has', () => {
        expect(feedBlockTools({ hasSettings: true, canDelete: false })).toEqual(['settings']);
        expect(feedBlockTools({ hasSettings: false, canDelete: true })).toEqual(['delete']);
        expect(feedBlockTools({ hasSettings: false, canDelete: false })).toEqual([]);
    });
});
