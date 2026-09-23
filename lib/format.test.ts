import { describe, expect, it } from 'vitest';

import { formatBytes, formatSignedDelta } from '@/lib/format';

describe('formatSignedDelta', () => {
    it('prefixes an increase with a plus sign', () => {
        expect(formatSignedDelta(10 * 1024 ** 3, formatBytes)).toBe('+10 GB');
        expect(formatSignedDelta(1400, new Intl.NumberFormat('en').format)).toBe('+1,400');
    });

    it('prefixes a decrease with a minus sign and formats the magnitude', () => {
        expect(formatSignedDelta(-50, String)).toBe('−50');
    });
});
