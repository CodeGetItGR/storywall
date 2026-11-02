import { defaultLocale, type Locale, locales } from '@/i18n/config';
import type { AppConfigResponseDto, EventTypeConvention } from '@/lib/api/types';
import { absoluteUrl } from '@/lib/seo';
import { showsUnlaunchedOccasions } from '@/lib/unreleasedPages';

export type Occasion = {
    eventType: EventTypeConvention;
    // Latin letters only; never change once live (docs/seo-guidelines.md).
    slugs: Record<Locale, string>;
    // Copy exists in both languages. A page goes live only when ready and the type is enabled.
    ready: boolean;
    // Live on the production site too. The rest stay off it until launch (lib/unreleasedPages.ts).
    launched: boolean;
};

// One list drives the routes, sitemap, hreflang and every link to an occasion page.
export const OCCASIONS: readonly Occasion[] = [
    { eventType: 'WEDDING', slugs: { en: 'weddings', el: 'gamos' }, ready: true, launched: true },
    { eventType: 'BAPTISM', slugs: { en: 'baptisms', el: 'vaptisi' }, ready: true, launched: false },
    { eventType: 'BIRTHDAY', slugs: { en: 'birthdays', el: 'genethlia' }, ready: false, launched: false },
    { eventType: 'BABY_SHOWER', slugs: { en: 'baby-showers', el: 'baby-shower' }, ready: false, launched: false },
    { eventType: 'GENDER_REVEAL', slugs: { en: 'gender-reveal', el: 'gender-reveal' }, ready: false, launched: false },
    { eventType: 'REUNION', slugs: { en: 'reunions', el: 'reunion' }, ready: false, launched: false },
    { eventType: 'PRIVATE_PARTY', slugs: { en: 'private-parties', el: 'idiotiko-parti' }, ready: false, launched: false },
    { eventType: 'SOCIAL_EVENT', slugs: { en: 'social-events', el: 'koinonikes-ekdiloseis' }, ready: false, launched: false },
];

// On the production site, only the launched ones (showsUnlaunchedOccasions in lib/unreleasedPages.ts).
export function readyOccasions(): Occasion[] {
    const showsUnlaunched = showsUnlaunchedOccasions();
    return OCCASIONS.filter((occasion) => occasion.ready && (occasion.launched || showsUnlaunched));
}

// Ready occasions whose event type is enabled. null (config unknown) → every ready occasion,
// matching the page gate.
export function liveOccasions(enabled: ReadonlySet<EventTypeConvention> | null): Occasion[] {
    return readyOccasions().filter((occasion) => !enabled || enabled.has(occasion.eventType));
}

// The same, from the event types the config enables. Unknown (config failed) → every ready occasion.
export function liveOccasionsInConfig(config: AppConfigResponseDto | null): Occasion[] {
    return liveOccasions(config ? new Set(config.eventTypes.filter((type) => type.isEnabled).map((type) => type.eventTypeKey)) : null);
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

// The ready occasion page a URL shows, and in which language, read by proxy.ts. Null for any other path.
export function occasionPageForPath(pathname: string): { occasion: Occasion; locale: Locale } | null {
    for (const occasion of readyOccasions()) {
        for (const locale of locales) {
            if (occasionPath(occasion, locale) === pathname) return { occasion, locale };
        }
    }
    return null;
}

export function occasionLocaleForPath(pathname: string): Locale | null {
    return occasionPageForPath(pathname)?.locale ?? null;
}
