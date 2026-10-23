import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    findReadyOccasion,
    liveOccasions,
    occasionLanguageAlternates,
    occasionLocaleForPath,
    occasionPath,
    OCCASIONS,
    readyOccasions,
} from '@/lib/occasions/occasions';
import { SITE_URL } from '@/lib/seo';

const wedding = OCCASIONS.find((occasion) => occasion.eventType === 'WEDDING')!;

describe('occasion registry', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('has no ready occasion on the production site before launch', () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        expect(readyOccasions()).toEqual([]);
        expect(findReadyOccasion('en', 'weddings')).toBeNull();
        expect(occasionLocaleForPath('/el/gamos')).toBeNull();
    });

    it('lists every event type once with unique slugs per locale', () => {
        expect(OCCASIONS.map((occasion) => occasion.eventType).sort()).toEqual([
            'BABY_SHOWER',
            'BAPTISM',
            'BIRTHDAY',
            'GENDER_REVEAL',
            'PRIVATE_PARTY',
            'REUNION',
            'SOCIAL_EVENT',
            'WEDDING',
        ]);
        expect(new Set(OCCASIONS.map((occasion) => occasion.slugs.en)).size).toBe(OCCASIONS.length);
        expect(new Set(OCCASIONS.map((occasion) => occasion.slugs.el)).size).toBe(OCCASIONS.length);
    });

    it('ships wedding and baptism as ready', () => {
        expect(readyOccasions().map((occasion) => occasion.eventType)).toEqual(['WEDDING', 'BAPTISM']);
    });

    it('keeps only enabled occasions, or every ready one when the config is unknown', () => {
        const types = (enabled: ReadonlySet<'WEDDING' | 'BAPTISM'> | null) => liveOccasions(enabled).map((occasion) => occasion.eventType);
        expect(types(new Set(['WEDDING']))).toEqual(['WEDDING']);
        expect(types(new Set())).toEqual([]);
        expect(types(null)).toEqual(['WEDDING', 'BAPTISM']);
    });

    it('finds a ready occasion only by its own language slug', () => {
        expect(findReadyOccasion('en', 'weddings')?.eventType).toBe('WEDDING');
        expect(findReadyOccasion('el', 'gamos')?.eventType).toBe('WEDDING');
        expect(findReadyOccasion('el', 'weddings')).toBeNull();
        expect(findReadyOccasion('en', 'gamos')).toBeNull();
        expect(findReadyOccasion('en', 'birthdays')).toBeNull();
    });

    it('builds paths and alternates', () => {
        expect(occasionPath(wedding, 'en')).toBe('/weddings');
        expect(occasionPath(wedding, 'el')).toBe('/el/gamos');
        expect(occasionLanguageAlternates(wedding)).toEqual({
            en: `${SITE_URL}/weddings`,
            el: `${SITE_URL}/el/gamos`,
            'x-default': `${SITE_URL}/weddings`,
        });
    });

    it('resolves the locale of a ready occasion path', () => {
        expect(occasionLocaleForPath('/weddings')).toBe('en');
        expect(occasionLocaleForPath('/el/vaptisi')).toBe('el');
        expect(occasionLocaleForPath('/el/weddings')).toBeNull();
        expect(occasionLocaleForPath('/birthdays')).toBeNull();
        expect(occasionLocaleForPath('/feed')).toBeNull();
    });
});
