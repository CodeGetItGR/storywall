import { describe, expect, it } from 'vitest';

import { placeInfoTip } from '@/lib/adminInfoTip';

const viewport = { width: 375, height: 700 };
const bubble = { width: 256, height: 80 };

describe('placeInfoTip', () => {
    it('centres the bubble under the icon', () => {
        expect(placeInfoTip({ top: 100, bottom: 114, left: 180, width: 14 }, bubble, viewport)).toEqual({ top: 120, left: 59 });
    });

    it('keeps the bubble inside the viewport at the edges', () => {
        expect(placeInfoTip({ top: 100, bottom: 114, left: 4, width: 14 }, bubble, viewport).left).toBe(8);
        expect(placeInfoTip({ top: 100, bottom: 114, left: 360, width: 14 }, bubble, viewport).left).toBe(375 - 256 - 8);
    });

    it('goes above the icon when there is no room below', () => {
        expect(placeInfoTip({ top: 650, bottom: 664, left: 180, width: 14 }, bubble, viewport).top).toBe(650 - 6 - 80);
    });
});
