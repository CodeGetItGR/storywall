import { describe, expect, it } from 'vitest';

import { OCCASION_FEATURE_KEYS } from '@/lib/occasions/occasionFeatures';
import { readyOccasions } from '@/lib/occasions/occasions';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

type Json = Record<string, unknown>;

function keyPaths(value: unknown, prefix = ''): string[] {
    if (Array.isArray(value)) return value.flatMap((item, index) => keyPaths(item, `${prefix}[${index}]`));
    if (value && typeof value === 'object')
        return Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key));
    return [prefix];
}

describe('occasion copy', () => {
    it('has the same keys in English and Greek', () => {
        expect(keyPaths((el as Json).OccasionPages)).toEqual(keyPaths((en as Json).OccasionPages));
    });

    it.each(readyOccasions().map((occasion) => [occasion.eventType, occasion] as const))(
        '%s has copy for known features only',
        (eventType) => {
            for (const catalog of [en, el] as Json[]) {
                const copy = (catalog.OccasionPages as Json)[eventType] as Json;
                expect(OCCASION_FEATURE_KEYS).toEqual(expect.arrayContaining(Object.keys(copy.features as Json)));
                expect(((copy.meta as Json).title as string).length).toBeLessThanOrEqual(60);
                expect((copy.faq as unknown[]).length).toBeGreaterThanOrEqual(5);
            }
        },
    );

    it('has generic copy for every feature', () => {
        for (const catalog of [en, el] as Json[]) {
            const common = (catalog.OccasionPages as Json).common as Json;
            expect(Object.keys(common.features as Json)).toEqual([...OCCASION_FEATURE_KEYS]);
        }
    });

    it('gives each occasion a unique title', () => {
        for (const catalog of [en, el] as Json[]) {
            const titles = readyOccasions().map((occasion) => (((catalog.OccasionPages as Json)[occasion.eventType] as Json).meta as Json).title);
            expect(new Set(titles).size).toBe(titles.length);
        }
    });
});
