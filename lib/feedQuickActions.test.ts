import { describe, expect, it } from 'vitest';

import { edgeFadeMask, feedQuickActionKeys } from '@/lib/feedQuickActions';

const none = { invitationSlug: null, uploadToken: null, hasWishbook: false, canShare: false, hasVendors: false };

describe('feedQuickActionKeys', () => {
    it('lists every action the event has, in order', () => {
        expect(feedQuickActionKeys({ invitationSlug: 'maria', uploadToken: 'up', hasWishbook: true, canShare: true, hasVendors: true })).toEqual([
            'invitation',
            'photos',
            'wishbook',
            'share',
            'vendors',
        ]);
    });

    it('leaves out what the event does not have', () => {
        expect(feedQuickActionKeys(none)).toEqual([]);
        expect(feedQuickActionKeys({ ...none, hasWishbook: true, hasVendors: true })).toEqual(['wishbook', 'vendors']);
    });
});

describe('edgeFadeMask', () => {
    it('fades only the edges with more tiles past them', () => {
        expect(edgeFadeMask({ before: false, after: false })).toBeUndefined();
        expect(edgeFadeMask({ before: false, after: true })).toBe('linear-gradient(to right, black, black calc(100% - 3.5rem), transparent)');
        expect(edgeFadeMask({ before: true, after: false })).toBe('linear-gradient(to right, transparent, black 2.5rem, black)');
        expect(edgeFadeMask({ before: true, after: true })).toBe(
            'linear-gradient(to right, transparent, black 2.5rem, black calc(100% - 3.5rem), transparent)',
        );
    });
});
