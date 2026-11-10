import { getForBusinessPath, getQrWeddingPath } from '@/i18n/publicLocale';
import { funnelBreakdown, type FunnelBreakdownRow } from '@/lib/adminFunnel';
import type {
    CampaignDetailDto,
    CampaignLinkDto,
    CampaignLinkLanguage,
    CampaignLinksRequestDto,
    CampaignLinkTargetDto,
    CampaignPlacement,
} from '@/lib/api/types';
import { FOR_BUSINESS_HUB_LAUNCHED } from '@/lib/forBusinessRelease';
import { occasionPath, readyOccasions } from '@/lib/occasions/occasions';
import { SITE_URL } from '@/lib/seo';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

// The caps match Spring's CampaignLinkService.
const CAMPAIGN_UTM_MAX = 100;

// The approved "Where you'll share it" names, under AdminPage.campaigns.presets.
export type CampaignPresetKey =
    'instagram' | 'facebook' | 'tiktok' | 'googleAds' | 'pinterest' | 'youtube' | 'linkedin' | 'email' | 'partner' | 'qr' | 'custom';

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

// The values a link's full address is built from.
type CampaignUrlParts = CampaignLinkTargetDto;

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

// The paid mediums of Spring's SignupSourceRules.
const PAID_MEDIUMS: readonly string[] = ['cpc', 'ppc', 'paid', 'paid_social', 'display'];

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

// A landing page's key in the pages breakdown; '' for visits whose link is gone.
export const UNKNOWN_PAGE = '';

export function pageRows(pages: CampaignDetailDto['pages']): FunnelBreakdownRow[] {
    return funnelBreakdown(Object.fromEntries(pages.map((row) => [row.page ?? UNKNOWN_PAGE, row.visits])));
}
