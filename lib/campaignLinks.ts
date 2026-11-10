import { locales } from '@/i18n/config';
import { getForBusinessPath, getQrWeddingPath } from '@/i18n/publicLocale';
import type {
    CampaignLinkDto,
    CampaignLinkLanguage,
    CampaignLinkRequestDto,
    CampaignLinksRequestDto,
    CampaignLinkTargetDto,
    CampaignPlacement,
    CampaignRowDto,
} from '@/lib/api/types';
import { FOR_BUSINESS_HUB_LAUNCHED } from '@/lib/forBusinessRelease';
import { occasionPath, readyOccasions } from '@/lib/occasions/occasions';
import { SITE_URL } from '@/lib/seo';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

// The caps match Spring's CampaignLinkService.
export const CAMPAIGN_NAME_MAX = 80;
export const CAMPAIGN_UTM_MAX = 100;

export type CampaignPresetKey =
    | 'instagram'
    | 'facebook'
    | 'tiktok'
    | 'pinterest'
    | 'linkedin'
    | 'youtube'
    | 'instagramAds'
    | 'facebookAds'
    | 'tiktokAds'
    | 'googleAds'
    | 'email'
    | 'partner'
    | 'qr'
    | 'custom';

export type CampaignPresetGroup = 'social' | 'ads' | 'other';

type CampaignPreset = { key: CampaignPresetKey; group: CampaignPresetGroup; source: string; medium: string };

// Mediums follow Spring's SignupSourceRules, so each preset lands in the channel its name says:
// social → Social, paid_social and cpc → Ads, email → Email, partner → Partner. qr has no rule
// and counts as Direct. A partner's source is the partner's name, so it starts empty.
export const CAMPAIGN_PRESETS: readonly CampaignPreset[] = [
    { key: 'instagram', group: 'social', source: 'instagram', medium: 'social' },
    { key: 'facebook', group: 'social', source: 'facebook', medium: 'social' },
    { key: 'tiktok', group: 'social', source: 'tiktok', medium: 'social' },
    { key: 'pinterest', group: 'social', source: 'pinterest', medium: 'social' },
    { key: 'linkedin', group: 'social', source: 'linkedin', medium: 'social' },
    { key: 'youtube', group: 'social', source: 'youtube', medium: 'social' },
    { key: 'instagramAds', group: 'ads', source: 'instagram', medium: 'paid_social' },
    { key: 'facebookAds', group: 'ads', source: 'facebook', medium: 'paid_social' },
    { key: 'tiktokAds', group: 'ads', source: 'tiktok', medium: 'paid_social' },
    { key: 'googleAds', group: 'ads', source: 'google', medium: 'cpc' },
    { key: 'email', group: 'other', source: 'newsletter', medium: 'email' },
    { key: 'partner', group: 'other', source: '', medium: 'partner' },
    { key: 'qr', group: 'other', source: 'print', medium: 'qr' },
    { key: 'custom', group: 'other', source: '', medium: '' },
];

export const CAMPAIGN_PRESET_GROUPS: readonly CampaignPresetGroup[] = ['social', 'ads', 'other'];

export function findCampaignPreset(key: CampaignPresetKey): CampaignPreset {
    return CAMPAIGN_PRESETS.find((preset) => preset.key === key) ?? CAMPAIGN_PRESETS[CAMPAIGN_PRESETS.length - 1];
}

// A UTM value as it is typed: lowercase, spaces become dashes, anything Spring refuses is dropped.
export function toUtmValue(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9._-]/g, '')
        .slice(0, CAMPAIGN_UTM_MAX);
}

// Lowercase letters, digits, dot, dash and underscore, starting with a letter or digit.
export function isUtmValue(value: string): boolean {
    return /^[a-z0-9][a-z0-9._-]*$/.test(value) && value.length <= CAMPAIGN_UTM_MAX;
}

export type CampaignDestinationKind = 'home' | 'qrWedding' | 'forBusiness' | 'occasion';
export type CampaignDestination = { kind: CampaignDestinationKind; path: string };

// The pages a campaign can point at: each language's home, (once live here) wedding QR and partner
// page, and every ready occasion page. Landing pages carry the source on into the app.
export function campaignDestinations(): CampaignDestination[] {
    const destinations: CampaignDestination[] = [];
    for (const locale of locales) destinations.push({ kind: 'home', path: locale === 'en' ? '/' : `/${locale}` });
    if (showsUnreleasedPages()) {
        for (const locale of locales) destinations.push({ kind: 'qrWedding', path: getQrWeddingPath(locale) });
        if (FOR_BUSINESS_HUB_LAUNCHED) {
            for (const locale of locales) destinations.push({ kind: 'forBusiness', path: getForBusinessPath(locale) });
        }
    }
    for (const occasion of readyOccasions()) {
        for (const locale of locales) destinations.push({ kind: 'occasion', path: occasionPath(occasion, locale) });
    }
    return destinations;
}

type CampaignUrlParts = Pick<CampaignLinkRequestDto, 'destinationPath' | 'utmSource' | 'utmMedium' | 'utmCampaign'> & {
    destinationAnchor?: string | null;
};

// The address to share. Empty values are left out, so a half-filled form still previews.
export function campaignUrl(parts: CampaignUrlParts, origin: string = SITE_URL): string {
    const url = new URL(parts.destinationPath, origin);
    if (parts.utmSource) url.searchParams.set('utm_source', parts.utmSource);
    if (parts.utmMedium) url.searchParams.set('utm_medium', parts.utmMedium);
    if (parts.utmCampaign) url.searchParams.set('utm_campaign', parts.utmCampaign);
    if (parts.destinationAnchor) url.hash = parts.destinationAnchor;
    return url.toString();
}

export const CAMPAIGN_SHORT_LINK_PREFIX = '/c/';

// The short address to share: it redirects to the link's full URL.
export function campaignShortUrl(link: Pick<CampaignLinkDto, 'shortCode'>, origin: string = SITE_URL): string {
    return `${origin}${CAMPAIGN_SHORT_LINK_PREFIX}${link.shortCode}`;
}

// Where a short address leads: the full URL, plus what the address itself carried, such as the click
// id an ad platform adds. The saved link's own values win.
export function campaignRedirectUrl(target: CampaignLinkTargetDto, incoming: URLSearchParams, origin: string): string {
    const url = new URL(campaignUrl(target, origin));
    incoming.forEach((value, key) => {
        if (!url.searchParams.has(key)) url.searchParams.append(key, value);
    });
    return url.toString();
}

// How many links a campaign's set has in each language. Matches Spring's CampaignLinkSetService.
export const CAMPAIGN_SET_SIZE = 9;

export type CampaignSetLinkFormat = 'post' | 'story' | 'search';

// The placement of a link in a campaign's set, from its `<link_name>-<format>-<lang>` campaign value.
export function campaignSetLinkFormat(link: Pick<CampaignLinkDto, 'utmCampaign'>): CampaignSetLinkFormat | null {
    const match = /-(post|story|search)-(?:en|el)$/.exec(link.utmCampaign);
    return match ? (match[1] as CampaignSetLinkFormat) : null;
}

// A set's English links lead to `/` and its Greek links to `/el`.
export function campaignSetLinkLanguage(link: Pick<CampaignLinkDto, 'destinationPath'>): CampaignLinkLanguage {
    return link.destinationPath === '/el' ? 'el' : 'en';
}

// The address to copy. A Google ad gets the full address, as Google asks for the final page in an
// ad instead of a redirect. Anything else gets the short one.
export function campaignSetLinkUrl(link: CampaignUrlParts & Pick<CampaignLinkDto, 'shortCode' | 'utmCampaign'>): string {
    return campaignSetLinkFormat(link) === 'search' ? campaignUrl(link) : campaignShortUrl(link);
}

export type CampaignLinkForm = {
    preset: CampaignPresetKey;
    destinationPath: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    name: string;
};

export type CampaignLinkFormProblem = 'name' | 'source' | 'medium' | 'campaign';

export function emptyCampaignLinkForm(destinationPath: string): CampaignLinkForm {
    const preset = CAMPAIGN_PRESETS[0];
    return { preset: preset.key, destinationPath, utmSource: preset.source, utmMedium: preset.medium, utmCampaign: '', name: '' };
}

// The first thing to fix before saving, or null.
export function campaignLinkFormProblem(form: CampaignLinkForm): CampaignLinkFormProblem | null {
    const name = form.name.trim();
    if (!name || name.length > CAMPAIGN_NAME_MAX) return 'name';
    if (!isUtmValue(form.utmSource)) return 'source';
    if (!isUtmValue(form.utmMedium)) return 'medium';
    if (!isUtmValue(form.utmCampaign)) return 'campaign';
    return null;
}

export function requestOfCampaignLinkForm(form: CampaignLinkForm): CampaignLinkRequestDto {
    return {
        name: form.name.trim(),
        destinationPath: form.destinationPath,
        utmSource: form.utmSource,
        utmMedium: form.utmMedium,
        utmCampaign: form.utmCampaign,
    };
}

// The mediums of Spring's SignupSourceRules, so a link's section says the same as its channel.
const SOCIAL_MEDIUMS: readonly string[] = ['social', 'social_media'];
const PAID_MEDIUMS: readonly string[] = ['cpc', 'ppc', 'paid', 'paid_social', 'display'];

function campaignRowGroup({ utmMedium }: CampaignRowDto): CampaignPresetGroup {
    if (utmMedium && SOCIAL_MEDIUMS.includes(utmMedium)) return 'social';
    if (utmMedium && PAID_MEDIUMS.includes(utmMedium)) return 'ads';
    return 'other';
}

function compareCampaignRows(a: CampaignRowDto, b: CampaignRowDto): number {
    return (a.utmSource ?? '').localeCompare(b.utmSource ?? '') || (a.link?.name ?? '').localeCompare(b.link?.name ?? '');
}

export type CampaignLinkSection = { group: CampaignPresetGroup; rows: CampaignRowDto[] };

// Report rows in named sections, each sorted by platform, then name. Empty sections are left out.
export function campaignLinkSections(rows: CampaignRowDto[]): CampaignLinkSection[] {
    return CAMPAIGN_PRESET_GROUPS.map((group) => ({
        group,
        rows: rows.filter((row) => campaignRowGroup(row) === group).sort(compareCampaignRows),
    })).filter((section) => section.rows.length > 0);
}

// A stable key for a report row: its saved link, or its three values.
// Adds one currency-to-amount map into another.
export function addMoneyByCurrency(into: Record<string, number>, from: Record<string, number>) {
    for (const [currency, minor] of Object.entries(from)) into[currency] = (into[currency] ?? 0) + minor;
}

export type CampaignLinksTotal = { visits: number; sales: number; salesRevenueMinorByCurrency: Record<string, number> };

// The visits, sales and sales revenue of a set of link rows.
export function totalOf(rows: CampaignRowDto[]): CampaignLinksTotal {
    const total: CampaignLinksTotal = { visits: 0, sales: 0, salesRevenueMinorByCurrency: {} };
    for (const row of rows) {
        total.visits += row.visits;
        total.sales += row.sales;
        addMoneyByCurrency(total.salesRevenueMinorByCurrency, row.salesRevenueMinorByCurrency ?? {});
    }
    return total;
}

export function campaignRowKey(row: CampaignRowDto): string {
    return row.link?.id ?? `${row.utmSource ?? ''}|${row.utmMedium ?? ''}|${row.utmCampaign ?? ''}`;
}

// The platforms a campaign's links are grouped by, in the order they're shown.
export const CAMPAIGN_PLATFORMS = [
    'instagram',
    'facebook',
    'tiktok',
    'google',
    'pinterest',
    'youtube',
    'linkedin',
    'email',
    'partner',
    'qr',
    'other',
] as const;
export type CampaignPlatform = (typeof CAMPAIGN_PLATFORMS)[number];

// The approved "Where you'll share it" name each platform goes by (hover text and screen readers).
export const CAMPAIGN_PLATFORM_PRESETS: Readonly<Record<CampaignPlatform, CampaignPresetKey>> = {
    instagram: 'instagram',
    facebook: 'facebook',
    tiktok: 'tiktok',
    google: 'googleAds',
    pinterest: 'pinterest',
    youtube: 'youtube',
    linkedin: 'linkedin',
    email: 'email',
    partner: 'partner',
    qr: 'qr',
    other: 'custom',
};

const BRAND_PLATFORMS: readonly CampaignPlatform[] = ['instagram', 'facebook', 'tiktok', 'google', 'pinterest', 'youtube', 'linkedin'];
const MEDIUM_PLATFORMS: Readonly<Record<string, CampaignPlatform>> = { email: 'email', partner: 'partner', qr: 'qr' };

type LinkValues = Pick<CampaignLinkDto, 'utmSource' | 'utmMedium'>;

// A link's platform: its source when that's a brand, else what its medium says, else other. Values
// typed by hand may not be lowercase.
export function campaignLinkPlatform(link: LinkValues): CampaignPlatform {
    const source = link.utmSource.toLowerCase();
    return BRAND_PLATFORMS.find((platform) => platform === source) ?? MEDIUM_PLATFORMS[link.utmMedium.toLowerCase()] ?? 'other';
}

// The format Spring puts before the language in a placement's utm_campaign. Older links have none.
export type CampaignLinkFormat = 'post' | 'story' | 'search' | 'email' | 'partner' | 'qr' | 'link';

const FORMAT_PATTERN = /-(post|story|search|email|partner|qr|link)-(en|el)$/;

export function campaignLinkFormat(link: Pick<CampaignLinkDto, 'utmCampaign'>): CampaignLinkFormat | null {
    const match = FORMAT_PATTERN.exec(link.utmCampaign.toLowerCase());
    return match ? (match[1] as CampaignLinkFormat) : null;
}

export type CampaignLinkType = 'post' | 'story' | 'postAd' | 'storyAd' | 'searchAd';

// What a brand link is: a post, a story, either as an ad, or a Google search ad. Email, partner, QR and
// other links have no type. A link with no format (an older one) counts as a post.
export function campaignLinkType(link: LinkValues & Pick<CampaignLinkDto, 'utmCampaign'>): CampaignLinkType | null {
    const platform = campaignLinkPlatform(link);
    if (!BRAND_PLATFORMS.includes(platform)) return null;
    const paid = PAID_MEDIUMS.includes(link.utmMedium.toLowerCase());
    const format = campaignLinkFormat(link);
    if (platform === 'google') return paid || format === 'search' ? 'searchAd' : null;
    if (format === 'story') return paid ? 'storyAd' : 'story';
    return paid ? 'postAd' : 'post';
}

// From the campaign value, else from the page: /el and /el/... are Greek.
export function campaignLinkLanguage(link: Pick<CampaignLinkDto, 'utmCampaign' | 'destinationPath'>): CampaignLinkLanguage {
    const match = FORMAT_PATTERN.exec(link.utmCampaign.toLowerCase());
    if (match) return match[2] as CampaignLinkLanguage;
    return link.destinationPath === '/el' || link.destinationPath.startsWith('/el/') ? 'el' : 'en';
}

// What a link row shows, all of it read from the link's values: platform, type, a partner's or
// source's name, the language (only when the campaign has both), and the page unless it's home. Never
// the stored name, which repeats the campaign.
export type CampaignLinkLabelParts = {
    platform: CampaignPlatform;
    type: CampaignLinkType | null;
    text: string | null;
    language: CampaignLinkLanguage | null;
    page: string | null;
};

const HOME_PATHS: readonly string[] = ['/', '/el'];

export function campaignLinkLabel(link: CampaignLinkDto, campaignLinks: readonly CampaignLinkDto[]): CampaignLinkLabelParts {
    const platform = campaignLinkPlatform(link);
    const languages = new Set(campaignLinks.map(campaignLinkLanguage));
    return {
        platform,
        type: campaignLinkType(link),
        text: platform === 'partner' || platform === 'other' ? link.utmSource : null,
        language: languages.size > 1 ? campaignLinkLanguage(link) : null,
        page: HOME_PATHS.includes(link.destinationPath) ? null : link.destinationPath,
    };
}

// The address to copy: a Google search ad's full one, as Google asks for the final page in an ad
// instead of a redirect; the short one for anything else.
export function campaignLinkShareUrl(link: CampaignLinkDto): string {
    return campaignLinkType(link) === 'searchAd' ? campaignUrl(link) : campaignShortUrl(link);
}

// The languages a campaign's links come in, in the picker's order.
export const CAMPAIGN_LINK_LANGUAGES: readonly CampaignLinkLanguage[] = ['el', 'en'];

// What the link picker offers, in its order, with the values Spring gives each placement's links
// (CampaignPlacement in guestwall-be). A partner link's source is the partner's name, and Other's source
// and medium are typed, so theirs are null here.
export type CampaignPlacementOption = {
    placement: CampaignPlacement;
    platform: CampaignPlatform;
    type: CampaignLinkType | null;
    source: string | null;
    medium: string | null;
    format: CampaignLinkFormat;
};

export const CAMPAIGN_PLACEMENTS: readonly CampaignPlacementOption[] = [
    { placement: 'INSTAGRAM_POST', platform: 'instagram', type: 'post', source: 'instagram', medium: 'social', format: 'post' },
    { placement: 'INSTAGRAM_STORY', platform: 'instagram', type: 'story', source: 'instagram', medium: 'social', format: 'story' },
    { placement: 'INSTAGRAM_POST_AD', platform: 'instagram', type: 'postAd', source: 'instagram', medium: 'paid_social', format: 'post' },
    { placement: 'INSTAGRAM_STORY_AD', platform: 'instagram', type: 'storyAd', source: 'instagram', medium: 'paid_social', format: 'story' },
    { placement: 'FACEBOOK_POST', platform: 'facebook', type: 'post', source: 'facebook', medium: 'social', format: 'post' },
    { placement: 'FACEBOOK_POST_AD', platform: 'facebook', type: 'postAd', source: 'facebook', medium: 'paid_social', format: 'post' },
    { placement: 'TIKTOK_POST', platform: 'tiktok', type: 'post', source: 'tiktok', medium: 'social', format: 'post' },
    { placement: 'TIKTOK_POST_AD', platform: 'tiktok', type: 'postAd', source: 'tiktok', medium: 'paid_social', format: 'post' },
    { placement: 'GOOGLE_ADS', platform: 'google', type: 'searchAd', source: 'google', medium: 'cpc', format: 'search' },
    { placement: 'PINTEREST', platform: 'pinterest', type: 'post', source: 'pinterest', medium: 'social', format: 'post' },
    { placement: 'YOUTUBE', platform: 'youtube', type: 'post', source: 'youtube', medium: 'social', format: 'post' },
    { placement: 'LINKEDIN', platform: 'linkedin', type: 'post', source: 'linkedin', medium: 'social', format: 'post' },
    { placement: 'EMAIL', platform: 'email', type: null, source: 'newsletter', medium: 'email', format: 'email' },
    { placement: 'PARTNER', platform: 'partner', type: null, source: null, medium: 'partner', format: 'partner' },
    { placement: 'PRINTED_QR', platform: 'qr', type: null, source: 'print', medium: 'qr', format: 'qr' },
    { placement: 'OTHER', platform: 'other', type: null, source: null, medium: null, format: 'link' },
];

// A page a campaign's links can open, with its address in each language. key goes into utm_campaign;
// home has none.
export type CampaignPageOption = { key: string | null; kind: CampaignDestinationKind; paths: Record<CampaignLinkLanguage, string> };

function pathsOf(path: (language: CampaignLinkLanguage) => string): Record<CampaignLinkLanguage, string> {
    return { el: path('el'), en: path('en') };
}

// Home first, then (once live here) wedding QR and the business page, then every ready occasion page.
export function campaignPageOptions(): CampaignPageOption[] {
    const options: CampaignPageOption[] = [{ key: null, kind: 'home', paths: { en: '/', el: '/el' } }];
    if (showsUnreleasedPages()) {
        options.push({ key: 'qr-wedding', kind: 'qrWedding', paths: pathsOf(getQrWeddingPath) });
        if (FOR_BUSINESS_HUB_LAUNCHED) options.push({ key: 'business', kind: 'forBusiness', paths: pathsOf(getForBusinessPath) });
    }
    for (const occasion of readyOccasions()) {
        options.push({ key: occasion.slugs.en, kind: 'occasion', paths: pathsOf((language) => occasionPath(occasion, language)) });
    }
    return options;
}

// A placement's utm_campaign, as Spring builds it: link name, page, format, language.
export function campaignPlacementCampaign(
    linkName: string,
    pageKey: string | null,
    format: CampaignLinkFormat,
    language: CampaignLinkLanguage,
): string {
    return [linkName, pageKey, format, language].filter(Boolean).join('-');
}

// True when the campaign already has this placement on this page in every chosen language. Spring skips
// a link the campaign already has, so a placement added in only some of them can still be ticked.
export function isPlacementAdded(
    option: CampaignPlacementOption,
    languages: readonly CampaignLinkLanguage[],
    pageKey: string | null,
    linkName: string,
    links: readonly CampaignLinkDto[],
): boolean {
    const { source, medium, format } = option;
    if (source === null || medium === null || languages.length === 0) return false;
    return languages.every((language) => {
        const utmCampaign = campaignPlacementCampaign(linkName, pageKey, format, language);
        return links.some((link) => link.utmSource === source && link.utmMedium === medium && link.utmCampaign === utmCampaign);
    });
}

// What the picker holds. partnerName, utmSource and utmMedium are already utm values.
export type CampaignLinkSelection = {
    placements: ReadonlySet<CampaignPlacement>;
    languages: readonly CampaignLinkLanguage[];
    page: CampaignPageOption;
    partnerName: string;
    utmSource: string;
    utmMedium: string;
};

// The add-links request: placements in the picker's order, and the typed values only with the
// placement that uses them.
export function campaignLinksRequest(selection: CampaignLinkSelection): CampaignLinksRequestDto {
    const { placements, page } = selection;
    return {
        placements: CAMPAIGN_PLACEMENTS.map((entry) => entry.placement).filter((placement) => placements.has(placement)),
        languages: [...selection.languages],
        pageKey: page.key,
        pagePaths: page.key === null ? null : { ...page.paths },
        partnerName: placements.has('PARTNER') ? selection.partnerName : null,
        utmSource: placements.has('OTHER') ? selection.utmSource : null,
        utmMedium: placements.has('OTHER') ? selection.utmMedium : null,
    };
}
