import { defaultLocale, type Locale, locales } from '@/i18n/config';
import type { EventTypeConvention } from '@/lib/api/types';
import { absoluteUrl } from '@/lib/seo';

export type OccasionImage = { src: string; width: number; height: number };

export type Occasion = {
    eventType: EventTypeConvention;
    // Latin letters only; never change once live (docs/seo-guidelines.md).
    slugs: Record<Locale, string>;
    // Copy exists in both languages. A page goes live only when ready and the type is enabled.
    ready: boolean;
    // null → the brand hero art.
    heroImage: OccasionImage | null;
};

// One list drives the routes, sitemap, hreflang and every link to an occasion page.
export const OCCASIONS: readonly Occasion[] = [
    {
        eventType: 'WEDDING',
        slugs: { en: 'weddings', el: 'gamos' },
        ready: true,
        heroImage: { src: '/landing/wedding-party-celebrating-with-social-storywall-overlays.webp', width: 2048, height: 1152 },
    },
    {
        eventType: 'BAPTISM',
        slugs: { en: 'baptisms', el: 'vaptisi' },
        ready: true,
        heroImage: { src: '/landing/happy-baptism-celebration-outside-the-church-on-a-greek-island.webp', width: 1536, height: 1024 },
    },
    { eventType: 'BIRTHDAY', slugs: { en: 'birthdays', el: 'genethlia' }, ready: false, heroImage: null },
    { eventType: 'BABY_SHOWER', slugs: { en: 'baby-showers', el: 'baby-shower' }, ready: false, heroImage: null },
    {
        eventType: 'GENDER_REVEAL',
        slugs: { en: 'gender-reveal', el: 'gender-reveal' },
        ready: false,
        heroImage: { src: '/landing/gender-reveal-box-opening-with-blue-balloons-and-confetti.webp', width: 1536, height: 1024 },
    },
    { eventType: 'REUNION', slugs: { en: 'reunions', el: 'reunion' }, ready: false, heroImage: null },
    { eventType: 'PRIVATE_PARTY', slugs: { en: 'private-parties', el: 'idiotiko-parti' }, ready: false, heroImage: null },
    { eventType: 'SOCIAL_EVENT', slugs: { en: 'social-events', el: 'koinonikes-ekdiloseis' }, ready: false, heroImage: null },
];

export function readyOccasions(): Occasion[] {
    return OCCASIONS.filter((occasion) => occasion.ready);
}

// Ready occasions whose event type is enabled. null (config unknown) → every ready occasion,
// matching the page gate.
export function liveOccasions(enabled: ReadonlySet<EventTypeConvention> | null): Occasion[] {
    return readyOccasions().filter((occasion) => !enabled || enabled.has(occasion.eventType));
}

export function findReadyOccasion(locale: Locale, slug: string): Occasion | null {
    return readyOccasions().find((occasion) => occasion.slugs[locale] === slug) ?? null;
}

export function findOccasion(eventType: EventTypeConvention): Occasion | null {
    return OCCASIONS.find((occasion) => occasion.eventType === eventType) ?? null;
}

export function occasionPath(occasion: Occasion, locale: Locale): string {
    return locale === defaultLocale ? `/${occasion.slugs[locale]}` : `/${locale}/${occasion.slugs[locale]}`;
}

export function occasionAlternatePaths(occasion: Occasion): Record<Locale, string> {
    return Object.fromEntries(locales.map((locale) => [locale, occasionPath(occasion, locale)])) as Record<Locale, string>;
}

// Every language version plus x-default → the default-locale page, like the landing.
export function occasionLanguageAlternates(occasion: Occasion): Record<string, string> {
    const languages: Record<string, string> = {};
    for (const locale of locales) languages[locale] = absoluteUrl(occasionPath(occasion, locale));
    languages['x-default'] = absoluteUrl(occasionPath(occasion, defaultLocale));
    return languages;
}

// The locale a ready occasion page renders in, read by proxy.ts. Null for any other path.
export function occasionLocaleForPath(pathname: string): Locale | null {
    for (const occasion of readyOccasions()) {
        for (const locale of locales) {
            if (occasionPath(occasion, locale) === pathname) return locale;
        }
    }
    return null;
}
