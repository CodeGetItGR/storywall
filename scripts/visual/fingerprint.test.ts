// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { fingerprint } from './fingerprint';

const entry = { id: 'a', state: 'changed' as const, beforeHash: 'b1', afterHash: 'h1' };

describe('fingerprint', () => {
    it('ignores the order of entries', () => {
        const other = { ...entry, id: 'b' };
        expect(fingerprint([entry, other])).toBe(fingerprint([other, entry]));
    });

    it('changes when an image changes', () => {
        expect(fingerprint([entry])).not.toBe(fingerprint([{ ...entry, afterHash: 'h2' }]));
        expect(fingerprint([entry])).not.toBe(fingerprint([{ ...entry, beforeHash: 'b2' }]));
    });

    it('changes when the state changes', () => {
        expect(fingerprint([entry])).not.toBe(fingerprint([{ ...entry, state: 'new' }]));
    });
});
