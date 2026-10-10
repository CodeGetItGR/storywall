import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { FOR_BUSINESS_OCCASIONS, occasionsFor } from '@/lib/forBusinessOccasions';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

const catalogs = { en, el } as Record<string, unknown>;

function occasionCopy(locale: string, key: string): Record<string, unknown> | undefined {
    const page = (catalogs[locale] as { ForBusinessPage?: { occasions?: Record<string, Record<string, unknown>> } }).ForBusinessPage;
    return page?.occasions?.[key];
}

describe('FOR_BUSINESS_OCCASIONS', () => {
    it('starts with weddings', () => {
        expect(FOR_BUSINESS_OCCASIONS[0].eventTypeKey).toBe('WEDDING');
    });

    it.each(FOR_BUSINESS_OCCASIONS.map((occasion) => [occasion.eventTypeKey, occasion] as const))('%s has its image and its copy in every listed locale', (key, occasion) => {
        expect(existsSync(path.join(process.cwd(), 'public', occasion.imageSrc))).toBe(true);
        for (const locale of occasion.locales) {
            const copy = occasionCopy(locale, key);
            expect(copy?.name, `${locale}.${key}.name`).toEqual(expect.any(String));
            expect(copy?.line, `${locale}.${key}.line`).toEqual(expect.any(String));
            expect(copy?.alt, `${locale}.${key}.alt`).toEqual(expect.any(String));
        }
    });
});

describe('occasionsFor', () => {
    it('keeps the list order and filters by locale', () => {
        expect(occasionsFor('en').map((occasion) => occasion.eventTypeKey)).toEqual(['WEDDING', 'BAPTISM']);
        expect(occasionsFor('el').map((occasion) => occasion.eventTypeKey)).toEqual(['WEDDING', 'BAPTISM']);
    });
});
