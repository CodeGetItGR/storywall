import { describe, expect, it } from 'vitest';

import type { MediaResponseDto, VendorMeDto } from '@/lib/api/types';
import { SNEAK_PEEK_MAX_ITEMS, sneakPeekCandidates, sneakPeekPatch, sneakPeekState, toggleSneakPeekPick } from '@/lib/sneakPeek';

const START = '2026-11-01T16:00:00Z';
const AFTER = new Date('2026-11-01T18:00:00Z');
const BEFORE = new Date('2026-11-01T12:00:00Z');

function me(overrides: Partial<VendorMeDto> = {}): VendorMeDto {
    return {
        vendorId: 'v1',
        vendorType: 'PHOTOGRAPHER',
        capabilities: ['PRO_ALBUM', 'SNEAK_PEEK'],
        accessEndsAt: '2026-12-01T00:00:00Z',
        accessOpen: true,
        profileComplete: true,
        showPartnerPrompt: false,
        proStorageBytes: 0,
        proUsedBytes: 0,
        optedOut: false,
        hiddenByHost: false,
        toolsOff: null,
        approvedPartner: false,
        sneakPeek: { postId: null, mediaIds: [], content: null, used: false },
        ...overrides,
    };
}

const closed = { accessOpen: false, capabilities: [], toolsOff: 'ACCESS_ENDED' as const };
const posted = { postId: 'p1', mediaIds: ['m1'], content: 'Hi', used: true };
const deleted = { postId: null, mediaIds: [], content: null, used: true };

describe('sneakPeekState', () => {
    it('is hidden without the sneak peek', () => {
        expect(sneakPeekState(null, START, true, AFTER)).toBe('hidden');
        expect(sneakPeekState(me({ sneakPeek: null }), START, true, AFTER)).toBe('hidden');
    });

    it('waits for the event to start', () => {
        expect(sneakPeekState(me(), START, true, BEFORE)).toBe('notOpen');
    });

    it('needs an own Pro item, then is ready', () => {
        expect(sneakPeekState(me(), START, false, AFTER)).toBe('noItems');
        expect(sneakPeekState(me(), START, true, AFTER)).toBe('ready');
    });

    it('shows a posted one, editable while the tools are open', () => {
        expect(sneakPeekState(me({ sneakPeek: posted }), START, true, AFTER)).toBe('posted');
        expect(sneakPeekState(me({ ...closed, sneakPeek: posted }), START, true, AFTER)).toBe('postedClosed');
    });

    it('says it was used, and hides once the tools close', () => {
        expect(sneakPeekState(me({ sneakPeek: deleted }), START, true, AFTER)).toBe('used');
        expect(sneakPeekState(me({ ...closed, sneakPeek: deleted }), START, true, AFTER)).toBe('hidden');
        expect(sneakPeekState(me(closed), START, true, AFTER)).toBe('hidden');
    });
});

describe('sneakPeekCandidates', () => {
    const item = (id: string, overrides: Partial<MediaResponseDto>) =>
        ({ id, uploaderMemberId: 'me', status: 'READY', collection: 'PRO', ...overrides }) as MediaResponseDto;

    it("keeps the caller's own ready Pro items", () => {
        const items = [
            item('a', {}),
            item('b', { uploaderMemberId: 'other' }),
            item('c', { status: 'PROCESSING' }),
            item('d', { collection: 'GUEST' }),
        ];
        expect(sneakPeekCandidates(items, 'me').map((m) => m.id)).toEqual(['a']);
        expect(sneakPeekCandidates(items, null)).toEqual([]);
    });
});

describe('toggleSneakPeekPick', () => {
    it('adds in tap order, removes on a second tap, stops at the limit', () => {
        expect(toggleSneakPeekPick(['a'], 'b')).toEqual(['a', 'b']);
        expect(toggleSneakPeekPick(['a', 'b'], 'a')).toEqual(['b']);
        const full = Array.from({ length: SNEAK_PEEK_MAX_ITEMS }, (_, i) => `m${i}`);
        expect(toggleSneakPeekPick(full, 'extra')).toEqual(full);
    });
});

describe('sneakPeekPatch', () => {
    it('sends only what changed', () => {
        const initial = { mediaIds: ['a', 'b'], content: 'Hi' };
        expect(sneakPeekPatch(initial, { mediaIds: ['a', 'b'], content: 'Hi' })).toBeNull();
        expect(sneakPeekPatch(initial, { mediaIds: ['b', 'a'], content: 'Hi' })).toEqual({ mediaIds: ['b', 'a'] });
        expect(sneakPeekPatch(initial, { mediaIds: ['a', 'b'], content: '  ' })).toEqual({ content: '' });
        expect(sneakPeekPatch({ mediaIds: ['a'], content: null }, { mediaIds: ['a'], content: 'New' })).toEqual({ content: 'New' });
    });
});
