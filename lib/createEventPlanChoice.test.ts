import { describe, expect, it } from 'vitest';

import type { PlanTierResponseDto } from '@/lib/api/types';
import { compareLine, guestChips, joinFeatureNames, planHighlights } from '@/lib/createEventPlanChoice';

function plan(code: string, sortOrder: number, maxMembers: number | null, moduleKeys: string[]) {
    return { code, name: code, sortOrder, maxMembers, moduleKeys } as unknown as PlanTierResponseDto;
}

const START = plan('START', 1, 150, ['posts', 'gallery', 'qr_cards', 'playlist', 'schedule']);
const STORY = plan('STORY', 2, 300, ['posts', 'gallery', 'qr_cards', 'playlist', 'schedule', 'stories', 'rsvp', 'wishbook', 'member_roles']);
const SIGNATURE = plan('SIGNATURE', 3, 2500, STORY.moduleKeys);

describe('guestChips', () => {
    it('gives "up to" for every plan but the largest, which gets "more than" the one before', () => {
        expect(guestChips([STORY, SIGNATURE, START])).toEqual([
            { planCode: 'START', kind: 'upTo', count: 150 },
            { planCode: 'STORY', kind: 'upTo', count: 300 },
            { planCode: 'SIGNATURE', kind: 'moreThan', count: 300 },
        ]);
    });

    it('skips a plan with no guest limit, and the largest when the one before has none', () => {
        const open = plan('OPEN', 1, null, []);
        expect(guestChips([open, plan('BIG', 2, 500, [])])).toEqual([]);
        expect(guestChips([START, plan('OPEN', 2, null, [])])).toEqual([
            { planCode: 'START', kind: 'upTo', count: 150 },
            { planCode: 'OPEN', kind: 'moreThan', count: 150 },
        ]);
    });

    it('gives no chips for a single plan', () => {
        expect(guestChips([START])).toEqual([]);
    });
});

describe('planHighlights', () => {
    it('shows up to three modules the plan adds over the previous one, in the type order', () => {
        expect(planHighlights(STORY, START, 'WEDDING')).toEqual(['wishbook', 'rsvp', 'stories']);
    });

    it('shows the first plan its own top three', () => {
        expect(planHighlights(START, undefined, 'WEDDING')).toEqual(['gallery', 'qr_cards', 'playlist']);
    });

    it('is empty when nothing is added', () => {
        expect(planHighlights(SIGNATURE, STORY, 'WEDDING')).toEqual([]);
    });
});

describe('compareLine', () => {
    it('lists the first plan features, with "and more" past three', () => {
        expect(compareLine(START, undefined, 'WEDDING')).toEqual({ kind: 'own', keys: ['gallery', 'qr_cards', 'playlist'], more: true });
    });

    it('says what a later plan adds, or that it adds nothing', () => {
        expect(compareLine(STORY, START, 'WEDDING')).toEqual({ kind: 'plus', previousName: 'START', keys: ['wishbook', 'rsvp', 'stories'] });
        expect(compareLine(SIGNATURE, STORY, 'WEDDING')).toEqual({ kind: 'same', previousName: 'STORY' });
    });
});

describe('joinFeatureNames', () => {
    it('joins names with commas', () => {
        expect(joinFeatureNames(['Gallery', 'Posts', 'Wishbook'])).toBe('Gallery, Posts, Wishbook');
    });

    it('drops the comma after a name that ends in a question mark', () => {
        expect(joinFeatureNames(['Boy or girl?', 'Collection', 'Wishbook'])).toBe('Boy or girl? Collection, Wishbook');
        expect(joinFeatureNames(['Αγόρι ή κορίτσι;', 'Συλλογή', 'Βιβλίο Ευχών'])).toBe('Αγόρι ή κορίτσι; Συλλογή, Βιβλίο Ευχών');
        expect(joinFeatureNames(['Αγόρι ή κορίτσι;', 'Συλλογή'])).toBe('Αγόρι ή κορίτσι; Συλλογή');
    });

    it('handles one name and none', () => {
        expect(joinFeatureNames(['Gallery'])).toBe('Gallery');
        expect(joinFeatureNames([])).toBe('');
    });
});
