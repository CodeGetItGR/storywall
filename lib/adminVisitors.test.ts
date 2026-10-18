import { describe, expect, it } from 'vitest';

import { deviceRows, FEW_VISITS, formatPer100, isFewVisits, languageRows, sectionRows, signupsPer100Visits } from '@/lib/adminVisitors';

describe('signupsPer100Visits', () => {
    it('is sign-ups per 100 visits, or null without visits', () => {
        expect(signupsPer100Visits(3, 200)).toBe(1.5);
        expect(signupsPer100Visits(3, 0)).toBeNull();
    });
});

describe('formatPer100', () => {
    it('keeps one decimal at most and shows — for no value', () => {
        expect(formatPer100('en', 1.5)).toBe('1.5');
        expect(formatPer100('en', 2)).toBe('2');
        expect(formatPer100('en', null)).toBe('—');
    });
});

describe('isFewVisits', () => {
    it('tags a channel with some visits but fewer than the threshold', () => {
        expect(isFewVisits(FEW_VISITS - 1)).toBe(true);
        expect(isFewVisits(FEW_VISITS)).toBe(false);
        expect(isFewVisits(0)).toBe(false);
    });
});

describe('languageRows and deviceRows', () => {
    it('lists every known key in order with its share of visits', () => {
        expect(languageRows([{ language: 'en', visits: 30 }, { language: 'el', visits: 10 }])).toEqual([
            { key: 'el', value: 10, ratio: 0.25 },
            { key: 'en', value: 30, ratio: 0.75 },
        ]);
        expect(deviceRows([{ device: 'DESKTOP', visits: 5 }])).toEqual([
            { key: 'PHONE', value: 0, ratio: 0 },
            { key: 'DESKTOP', value: 5, ratio: 1 },
            { key: 'TABLET', value: 0, ratio: 0 },
        ]);
    });
});

describe('sectionRows', () => {
    it('keeps the page order and shows each section as a share of all visitors', () => {
        expect(
            sectionRows(
                [
                    { section: 'how_it_works', visitors: 80 },
                    { section: 'pricing', visitors: 20 },
                ],
                100,
            ),
        ).toEqual([
            { key: 'how_it_works', value: 80, ratio: 0.8 },
            { key: 'pricing', value: 20, ratio: 0.2 },
        ]);
        expect(sectionRows([{ section: 'faq', visitors: 0 }], 0)).toEqual([{ key: 'faq', value: 0, ratio: null }]);
    });
});
