import { getErrorCode } from '@/lib/api/errors';
import { INVITATION_SCHEMA_VERSION, type InvitationDocument } from '@/lib/invitation/document';
import { createSection, newSectionId } from '@/lib/invitation/newSection';
import { SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import { sectionsForEventType } from '@/lib/invitation/sectionRules';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { readThemePreview, type ThemePreview } from '@/lib/invitation/themePreview';

// The admin side of Save my date themes: guestwall-be's /api/admin/invitation-themes
// (InvitationThemeAdminController) and the list, drawer and modal logic around it.

export const INVITATION_THEME_STATUSES = ['DRAFT', 'ACTIVE', 'HIDDEN'] as const;
export type InvitationThemeStatus = (typeof INVITATION_THEME_STATUSES)[number];

// The event types the old app made themes for; the editor has section lists for each.
export const INVITATION_THEME_EVENT_TYPES = ['WEDDING', 'BAPTISM', 'BIRTHDAY', 'BABY_SHOWER', 'GENDER_REVEAL'] as const;

// The backend's limits (InvitationThemeRequestDto, InvitationThemeAdminService).
export const THEME_NAME_MAX = 120;
export const THEME_SLUG_MAX = 120;
export const THEME_SEO_TITLE_MAX = 120;
export const THEME_SEO_DESCRIPTION_MAX = 320;
const THEME_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Postgres int; the backend takes any.
const SORT_ORDER_LIMIT = 2_147_483_647;

// Not in ERROR_CODES: there every code needs a generic message, and these two are only
// ever shown by the theme drawer and modal, in their own words.
const SLUG_TAKEN_CODE = 5200;
const REVISION_STALE_CODE = 5201;

// InvitationThemeSummaryDto: one row of the list.
export type AdminInvitationThemeSummaryDto = {
    id: string;
    eventType: string;
    status: InvitationThemeStatus;
    name: string;
    slug: string;
    code: string | null;
    sortOrder: number;
    revision: number;
    // May be presigned and expire; the list is refetched on every visit.
    cardThumbUrl: string | null;
    updatedAt: string;
};

export type AdminInvitationThemeAssetDto = {
    assetId: string;
    url: string;
    contentType: string;
    width: number;
    height: number;
    byteSize: number;
};

// InvitationThemeAdminDto: a whole theme. Send `revision` back with the next save.
export type AdminInvitationThemeDto = {
    id: string;
    eventType: string;
    status: InvitationThemeStatus;
    name: string;
    slug: string;
    code: string | null;
    description: string | null;
    cardColor: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImageAssetId: string | null;
    cardThumbAssetId: string | null;
    productPhotos: { mediaId: string; alt: string }[];
    sortOrder: number;
    design: Record<string, unknown>;
    document: Record<string, unknown>;
    revision: number;
    assets: AdminInvitationThemeAssetDto[];
    updatedAt: string;
};

// InvitationThemeRequestDto: a create, or a full replacement of every field.
export type AdminInvitationThemeRequestDto = {
    eventType: string;
    status: InvitationThemeStatus;
    name: string;
    slug: string;
    code?: string | null;
    description?: string | null;
    cardColor?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    ogImageAssetId?: string | null;
    cardThumbAssetId?: string | null;
    productPhotos: { mediaId: string; alt: string }[];
    sortOrder: number;
    design: Record<string, unknown>;
    document: Record<string, unknown>;
    revision?: number;
};

// InvitationThemeDuplicateRequestDto.
export type AdminInvitationThemeDuplicateDto = { name: string; slug: string };

// ---- List ----

export type InvitationThemeStatusFilter = 'ALL' | InvitationThemeStatus;
export type InvitationThemeEventTypeFilter = 'ALL' | string;
export const INVITATION_THEME_STATUS_FILTERS: InvitationThemeStatusFilter[] = ['ALL', ...INVITATION_THEME_STATUSES];

// Lower case, without Greek or Latin accents, so "γαμος" finds "Γάμος".
function foldForSearch(text: string): string {
    return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('el');
}

export function filterInvitationThemes(
    themes: AdminInvitationThemeSummaryDto[],
    { search, status, eventType }: { search: string; status: InvitationThemeStatusFilter; eventType: InvitationThemeEventTypeFilter },
): AdminInvitationThemeSummaryDto[] {
    const query = foldForSearch(search.trim());
    return themes.filter(
        (theme) =>
            (status === 'ALL' || theme.status === status) &&
            (eventType === 'ALL' || theme.eventType === eventType) &&
            (!query || [theme.name, theme.slug, theme.code ?? ''].some((text) => foldForSearch(text).includes(query))),
    );
}

// The event types to filter by: those the list has, in the order themes are made for them.
export function themeEventTypes(themes: AdminInvitationThemeSummaryDto[]): string[] {
    const present = new Set(themes.map((theme) => theme.eventType));
    const known: string[] = INVITATION_THEME_EVENT_TYPES.filter((eventType) => present.has(eventType));
    const others = [...present].filter((eventType) => !known.includes(eventType)).sort();
    return [...known, ...others];
}

// ---- Slugs ----

const GREEK_TO_LATIN: Record<string, string> = {
    α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n',
    ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
};

// A slug from a theme name, Greek written in Latin letters: "Γάμος 001" → "gamos-001".
// Empty when nothing usable is left.
export function slugifyThemeName(name: string): string {
    return foldForSearch(name)
        .split('')
        .map((char) => GREEK_TO_LATIN[char] ?? char)
        .join('')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, THEME_SLUG_MAX)
        .replace(/-+$/, '');
}

// `base` (or "theme" when empty), with -2, -3… added until no other theme has it.
export function uniqueThemeSlug(base: string, taken: Iterable<string>): string {
    const used = new Set(taken);
    const root = base || 'theme';
    if (!used.has(root)) return root;
    for (let n = 2; ; n += 1) {
        const suffix = `-${n}`;
        const candidate = `${root.slice(0, THEME_SLUG_MAX - suffix.length).replace(/-+$/, '')}${suffix}`;
        if (!used.has(candidate)) return candidate;
    }
}

export function isValidThemeSlug(slug: string): boolean {
    return slug.length <= THEME_SLUG_MAX && THEME_SLUG_PATTERN.test(slug);
}

// The name as the backend stores it: trimmed, inner whitespace kept.
export function isValidThemeName(name: string): boolean {
    const trimmed = name.trim();
    return trimmed.length > 0 && trimmed.length <= THEME_NAME_MAX;
}

// ---- Drawer ----

export type InvitationThemeDetails = {
    name: string;
    eventType: string;
    status: InvitationThemeStatus;
    slug: string;
    seoTitle: string;
    seoDescription: string;
    // Kept as typed, so clearing the field to type a new number works.
    sortOrder: string;
};

export type InvitationThemeDetailsErrors = Partial<Record<'name' | 'slug' | 'sortOrder', true>>;

export function themeDetails(theme: AdminInvitationThemeDto): InvitationThemeDetails {
    return {
        name: theme.name,
        eventType: theme.eventType,
        status: theme.status,
        slug: theme.slug,
        seoTitle: theme.seoTitle ?? '',
        seoDescription: theme.seoDescription ?? '',
        sortOrder: String(theme.sortOrder),
    };
}

function parseSortOrder(value: string): number | null {
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) return null;
    const number = Number(trimmed);
    return Math.abs(number) <= SORT_ORDER_LIMIT ? number : null;
}

export function validateThemeDetails(details: InvitationThemeDetails): InvitationThemeDetailsErrors {
    const errors: InvitationThemeDetailsErrors = {};
    if (!isValidThemeName(details.name)) errors.name = true;
    if (!isValidThemeSlug(details.slug)) errors.slug = true;
    if (parseSortOrder(details.sortOrder) === null) errors.sortOrder = true;
    return errors;
}

export function hasThemeDetailErrors(errors: InvitationThemeDetailsErrors): boolean {
    return Object.keys(errors).length > 0;
}

export function themeDetailsChanged(details: InvitationThemeDetails, theme: AdminInvitationThemeDto): boolean {
    const saved = themeDetails(theme);
    return (Object.keys(saved) as (keyof InvitationThemeDetails)[]).some((key) => saved[key] !== details[key]);
}

// The slug follows the name while it still is the name's slug, so renaming a fresh theme
// renames its link too, but a slug someone chose, or an imported one, is never touched.
export function followNameSlug(details: InvitationThemeDetails, nextName: string): string {
    return details.slug === slugifyThemeName(details.name) ? slugifyThemeName(nextName) || details.slug : details.slug;
}

function blankToNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

// A PUT replaces every field: the drawer's details over the theme as it was loaded.
export function themeUpdateRequest(theme: AdminInvitationThemeDto, details: InvitationThemeDetails): AdminInvitationThemeRequestDto {
    return {
        eventType: details.eventType,
        status: details.status,
        name: details.name.trim(),
        slug: details.slug,
        code: theme.code,
        description: theme.description,
        cardColor: theme.cardColor,
        seoTitle: blankToNull(details.seoTitle),
        seoDescription: blankToNull(details.seoDescription),
        ogImageAssetId: theme.ogImageAssetId,
        cardThumbAssetId: theme.cardThumbAssetId,
        productPhotos: theme.productPhotos,
        sortOrder: parseSortOrder(details.sortOrder) ?? theme.sortOrder,
        design: theme.design,
        document: theme.document,
        revision: theme.revision,
    };
}

// The theme was saved since this copy was loaded.
export function isThemeRevisionStale(error: unknown): boolean {
    return getErrorCode(error) === REVISION_STALE_CODE;
}

export type InvitationThemeSaveFailure = { kind: 'slugTaken' } | { kind: 'stale' } | { kind: 'other'; error: unknown };

export function themeSaveFailure(error: unknown): InvitationThemeSaveFailure {
    const code = getErrorCode(error);
    if (code === SLUG_TAKEN_CODE) return { kind: 'slugTaken' };
    if (code === REVISION_STALE_CODE) return { kind: 'stale' };
    return { kind: 'other', error };
}

// ---- New theme ----

// A theme with no images yet: the sample theme's colours and fonts, without its pictures.
// The backend refuses image references before the images are uploaded.
export const BLANK_THEME_DESIGN: ThemeDesign = {
    ...SAMPLE_THEME,
    backgrounds: {
        top: { mode: 'cover', stableRepeat: false },
        content: { mode: 'cover', stableRepeat: false },
        extra: { mode: 'cover', stableRepeat: false },
    },
    art: {},
    elements: [],
    frames: [],
    transitions: [],
};

// The event type's default sections, filled the way the old editor filled new ones, then the footer.
export function blankThemeDocument(eventType: string, slug: string, newId: () => string = newSectionId): InvitationDocument {
    const types = sectionsForEventType(eventType).default.filter((type) => type !== 'footer');
    return {
        schemaVersion: INVITATION_SCHEMA_VERSION,
        themeId: slug,
        overrides: {},
        sections: [
            ...types.map((type) => createSection(type as Exclude<typeof type, 'footer'>, eventType, newId)),
            { ...SAMPLE_SECTIONS.footer, id: newId() },
        ],
    };
}

export function themeCreateRequest(
    { name, eventType }: { name: string; eventType: string },
    takenSlugs: Iterable<string>,
    sortOrder: number,
): AdminInvitationThemeRequestDto {
    const slug = uniqueThemeSlug(slugifyThemeName(name), takenSlugs);
    return {
        eventType,
        status: 'DRAFT',
        name: name.trim(),
        slug,
        productPhotos: [],
        sortOrder,
        design: BLANK_THEME_DESIGN as unknown as Record<string, unknown>,
        document: blankThemeDocument(eventType, slug) as unknown as Record<string, unknown>,
    };
}

export function themeDuplicateRequest(name: string, takenSlugs: Iterable<string>): AdminInvitationThemeDuplicateDto {
    return { name: name.trim(), slug: uniqueThemeSlug(slugifyThemeName(name), takenSlugs) };
}

// One past the highest sort order of the event type's themes, so a new one lands last.
export function nextThemeSortOrder(themes: AdminInvitationThemeSummaryDto[], eventType: string): number {
    const orders = themes.filter((theme) => theme.eventType === eventType).map((theme) => theme.sortOrder);
    return orders.length ? Math.max(...orders) + 1 : 0;
}

// ---- Preview ----

// What the renderer draws for a theme as the admin API sends it, whatever its status.
// Throws when the theme isn't in the format the renderer draws.
export function adminThemePreview(theme: AdminInvitationThemeDto): ThemePreview {
    return readThemePreview({
        slug: theme.slug,
        name: theme.name,
        eventType: theme.eventType,
        design: theme.design,
        document: theme.document,
        assetUrls: Object.fromEntries(theme.assets.map((asset) => [asset.assetId, asset.url])),
    });
}
