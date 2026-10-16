import { describe, expect, it } from 'vitest';

import { FOUNDING_SPOTS_FALLBACK_TOTAL, foundingBlock, shouldSuggestTwin } from '@/lib/forBusiness';

describe('foundingBlock', () => {
    it('shows the live count while spots are left', () => {
        expect(foundingBlock({ foundingSpotsTotal: 20, foundingSpotsLeft: 7 })).toEqual({ kind: 'count', left: 7, total: 20 });
    });

    it('hides the block once every spot is taken', () => {
        expect(foundingBlock({ foundingSpotsTotal: 20, foundingSpotsLeft: 0 })).toEqual({ kind: 'hidden' });
    });

    it('falls back to the plain limit when Spring did not answer', () => {
        expect(foundingBlock(null)).toEqual({ kind: 'limited', total: FOUNDING_SPOTS_FALLBACK_TOTAL });
    });

    it('never shows a negative count', () => {
        expect(foundingBlock({ foundingSpotsTotal: 20, foundingSpotsLeft: -2 })).toEqual({ kind: 'hidden' });
    });
});

describe('shouldSuggestTwin', () => {
    it('suggests English on the Greek page to a browser with no Greek', () => {
        expect(shouldSuggestTwin('el', ['en-US', 'de'])).toBe(true);
        expect(shouldSuggestTwin('el', ['en-US', 'el'])).toBe(false);
        expect(shouldSuggestTwin('el', ['el-GR'])).toBe(false);
    });

    it('suggests Greek on the English page when Greek is the first choice', () => {
        expect(shouldSuggestTwin('en', ['el-GR', 'en'])).toBe(true);
        expect(shouldSuggestTwin('en', ['en', 'el'])).toBe(false);
    });

    it('stays quiet when the browser reports nothing', () => {
        expect(shouldSuggestTwin('el', [])).toBe(false);
        expect(shouldSuggestTwin('en', [])).toBe(false);
    });
});
