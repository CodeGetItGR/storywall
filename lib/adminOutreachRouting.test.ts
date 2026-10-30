import { describe, expect, it } from 'vitest';

import { formatOutreachHash, isOutreachHash, OUTREACH_HASH_ROOT, parseOutreachHash } from '@/lib/adminOutreachRouting';

describe('outreach hash', () => {
    it('recognises the list and one business', () => {
        expect(isOutreachHash('#outreach')).toBe(true);
        expect(isOutreachHash('#outreach/p-1')).toBe(true);
        expect(isOutreachHash('#outreachx')).toBe(false);
        expect(isOutreachHash('#campaigns')).toBe(false);
    });

    it('reads the id', () => {
        expect(parseOutreachHash('#outreach')).toBeNull();
        expect(parseOutreachHash('#outreach/')).toBeNull();
        expect(parseOutreachHash('#outreach/p%2F1')).toBe('p/1');
        expect(parseOutreachHash('#outreach/%E0%A4%A')).toBeNull();
        expect(parseOutreachHash('#applications/a-1')).toBeNull();
    });

    it('writes the hash', () => {
        expect(formatOutreachHash(null)).toBe(OUTREACH_HASH_ROOT);
        expect(formatOutreachHash('p/1')).toBe('#outreach/p%2F1');
    });
});
