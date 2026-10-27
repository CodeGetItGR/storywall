import { locales } from '@/i18n/config';
import { getForBusinessPath, getQrWeddingPath } from '@/i18n/publicLocale';
import type { CampaignLinkRequestDto, CampaignRowDto } from '@/lib/api/types';
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

// The pages a campaign can point at: each language's home, wedding QR and (once live here) partner
// page, and every ready occasion page. Landing pages carry the source on into the app.
export function campaignDestinations(): CampaignDestination[] {
    const destinations: CampaignDestination[] = [];
    for (const locale of locales) destinations.push({ kind: 'home', path: locale === 'en' ? '/' : `/${locale}` });
    for (const locale of locales) destinations.push({ kind: 'qrWedding', path: getQrWeddingPath(locale) });
    if (showsUnreleasedPages()) {
        for (const locale of locales) destinations.push({ kind: 'forBusiness', path: getForBusinessPath(locale) });
    }
    for (const occasion of readyOccasions()) {
        for (const locale of locales) destinations.push({ kind: 'occasion', path: occasionPath(occasion, locale) });
    }
    return destinations;
}

type CampaignUrlParts = Pick<CampaignLinkRequestDto, 'destinationPath' | 'utmSource' | 'utmMedium' | 'utmCampaign'>;

// The address to share. Empty values are left out, so a half-filled form still previews.
export function campaignUrl(parts: CampaignUrlParts, origin: string = SITE_URL): string {
    const url = new URL(parts.destinationPath, origin);
    if (parts.utmSource) url.searchParams.set('utm_source', parts.utmSource);
    if (parts.utmMedium) url.searchParams.set('utm_medium', parts.utmMedium);
    if (parts.utmCampaign) url.searchParams.set('utm_campaign', parts.utmCampaign);
    return url.toString();
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

// A stable key for a report row: its saved link, or its three values.
export function campaignRowKey(row: CampaignRowDto): string {
    return row.link?.id ?? `${row.utmSource ?? ''}|${row.utmMedium ?? ''}|${row.utmCampaign ?? ''}`;
}
