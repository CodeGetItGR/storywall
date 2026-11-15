import type { Locale } from '@/i18n/config';
import type { InvitationThemePublicDto } from '@/lib/invitation/themePreview';

// A theme as GET /api/invitation-themes?eventType= lists it (guestwall-be InvitationThemeCardDto).
export type InvitationThemeCardDto = {
    slug: string;
    name: string;
    eventType: string;
    cardColor: string | null;
    // Null when the theme has no card image. The URL may expire.
    cardThumbUrl: string | null;
};

// The event types the catalogue lists, in its order. Only these have themes today.
export const CATALOGUE_EVENT_TYPES = ['WEDDING', 'BAPTISM'] as const;
export type CatalogueEventType = (typeof CATALOGUE_EVENT_TYPES)[number];

export function isCatalogueEventType(value: unknown): value is CatalogueEventType {
    return typeof value === 'string' && (CATALOGUE_EVENT_TYPES as readonly string[]).includes(value);
}

export function invitationThemesEndpoint(eventType: CatalogueEventType): string {
    return `/api/invitation-themes?eventType=${eventType}`;
}

export const invitationThemeKeys = {
    all: ['invitationThemes'] as const,
    catalogue: () => [...invitationThemeKeys.all, 'catalogue'] as const,
    page: (slug: string) => [...invitationThemeKeys.all, 'page', slug] as const,
    // The theme's public answer as it comes, for the editor's theme switch.
    publicTheme: (slug: string) => [...invitationThemeKeys.all, 'public', slug] as const,
};

// Every event type's list, one after the other in the catalogue's order. Each list keeps the backend's
// own order (sort order, then name).
export function mergeCatalogue(lists: readonly InvitationThemeCardDto[][]): InvitationThemeCardDto[] {
    return lists.flat();
}

// How many cards show before "More designs" (and the scroll) reveal the next ones.
export const CATALOGUE_PAGE_SIZE = 24;

export const CATALOGUE_SORTS = ['recommended', 'az'] as const;
export type CatalogueSort = (typeof CATALOGUE_SORTS)[number];

export type CatalogueFilters = { eventType: CatalogueEventType | null; query: string; sort: CatalogueSort };

export const DEFAULT_CATALOGUE_FILTERS: CatalogueFilters = { eventType: null, query: '', sort: 'recommended' };

// The URL's search params the filters live in.
const PARAM = { eventType: 'type', query: 'q', sort: 'sort' } as const;

export type CatalogueSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

// The filters a catalogue link carries; anything it doesn't understand falls back to the default.
export function readCatalogueFilters(params: CatalogueSearchParams): CatalogueFilters {
    const eventType = firstValue(params[PARAM.eventType]);
    return {
        eventType: isCatalogueEventType(eventType) ? eventType : null,
        query: firstValue(params[PARAM.query]) ?? '',
        sort: firstValue(params[PARAM.sort]) === 'az' ? 'az' : 'recommended',
    };
}

// The catalogue's URL for these filters, leaving out the defaults so the plain catalogue keeps its canonical URL.
export function catalogueHref(path: string, filters: CatalogueFilters): string {
    const params = new URLSearchParams();
    if (filters.eventType) params.set(PARAM.eventType, filters.eventType);
    if (filters.query.trim()) params.set(PARAM.query, filters.query);
    if (filters.sort !== 'recommended') params.set(PARAM.sort, filters.sort);
    const search = params.toString();
    return search ? `${path}?${search}` : path;
}

// Lower case, without accents and with a final sigma as a plain one, so "Κυκνος" finds "Κύκνος".
export function searchText(value: string): string {
    return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ').trim();
}

export function matchesThemeSearch(theme: InvitationThemeCardDto, query: string): boolean {
    const needle = searchText(query);
    return !needle || searchText(theme.name).includes(needle);
}

// The themes the filters leave, in the order they ask for.
export function visibleThemes(themes: readonly InvitationThemeCardDto[], filters: CatalogueFilters, locale: Locale): InvitationThemeCardDto[] {
    const list = themes.filter((theme) => (!filters.eventType || theme.eventType === filters.eventType) && matchesThemeSearch(theme, filters.query));
    return filters.sort === 'az' ? [...list].sort((a, b) => a.name.localeCompare(b.name, locale)) : list;
}

// What a theme page shows: the theme's DTO without its design and document, which only the preview and
// the editor draw. Kept small because the page hands it to the browser.
export type InvitationThemePage = {
    slug: string;
    name: string;
    eventType: string;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImageUrl: string | null;
    cardColor: string | null;
    photos: { url: string; alt: string | null }[];
};

export function readThemePage(dto: InvitationThemePublicDto): InvitationThemePage {
    return {
        slug: dto.slug,
        name: dto.name,
        eventType: dto.eventType,
        seoTitle: blankToNull(dto.seoTitle),
        seoDescription: blankToNull(dto.seoDescription),
        ogImageUrl: blankToNull(dto.ogImageUrl),
        cardColor: blankToNull(dto.cardColor),
        photos: (dto.productPhotos ?? []).flatMap((photo) => (photo.url ? [{ url: photo.url, alt: blankToNull(photo.alt) }] : [])),
    };
}

function blankToNull(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

// The admin writes alt text in Greek, so only the Greek page uses it; otherwise the page's own wording.
export function themePhotoAlt(photo: InvitationThemePage['photos'][number], locale: Locale, fallback: string): string {
    return locale === 'el' && photo.alt ? photo.alt : fallback;
}

// The admin writes the search title and description in Greek too.
export function themeSeoCopy(theme: InvitationThemePage, locale: Locale, fallback: { title: string; description: string }) {
    return {
        title: (locale === 'el' && theme.seoTitle) || fallback.title,
        description: (locale === 'el' && theme.seoDescription) || fallback.description,
    };
}

// The image a theme's link shows when shared: the one the admin picked, else its first photo.
export function themeShareImage(theme: InvitationThemePage): string | null {
    return theme.ogImageUrl ?? theme.photos[0]?.url ?? null;
}

// Links that open a share in each app with the page's URL.
export function themeShareLinks(url: string, text: string) {
    const message = encodeURIComponent(`${text} ${url}`);
    return {
        messenger: `fb-messenger://share?link=${encodeURIComponent(url)}`,
        whatsapp: `https://wa.me/?text=${message}`,
        viber: `viber://forward?text=${message}`,
        email: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
    };
}

// The event type a theme's label shows, or null for one the catalogue has no label for.
export function themeEventTypeKey(eventType: string): CatalogueEventType | null {
    return isCatalogueEventType(eventType) ? eventType : null;
}

const HEX_COLOR = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i;
const DEFAULT_CARD_COLOR = '#ece4ef';

// What shows behind a card or photo while it loads, or in place of a missing one: the theme's own colour.
export function themeCardBackground(cardColor: string | null): string {
    const valid = cardColor && HEX_COLOR.test(cardColor) ? cardColor : DEFAULT_CARD_COLOR;
    const color = valid.length === 4 ? `#${[...valid.slice(1)].map((digit) => digit + digit).join('')}` : valid;
    return `linear-gradient(160deg, ${color}, ${color}99)`;
}
