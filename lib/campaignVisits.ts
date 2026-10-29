import { defaultLocale, locales } from '@/i18n/config';
import { endpoints } from '@/lib/api/endpoints';
import type { CampaignVisitKind, CampaignVisitRequestDto, VisitorLanguage } from '@/lib/api/types';

// Campaign visits for Spring's own counter (no cookie, nothing stored on the device). Each arrival
// counts for the link in its own URL, apart from the sign-up source's "first visit wins" rule.

export type Campaign = Pick<CampaignVisitRequestDto, 'utmSource' | 'utmMedium' | 'utmCampaign'>;

// The cap matches Spring's CampaignVisitRules and lib/signupSource.ts.
const UTM_MAX = 100;

// This visit's campaign, for the clicks that follow. Module memory: gone on the next full page load.
let visitCampaign: Campaign | null = null;

function utmValue(params: URLSearchParams, name: string): string | null {
    return params.get(name)?.trim().slice(0, UTM_MAX) || null;
}

// The campaign a URL carries: all three utm values (saved links always have them), or null.
export function campaignFromUrl(href: string): Campaign | null {
    const params = new URL(href).searchParams;
    const utmSource = utmValue(params, 'utm_source');
    const utmMedium = utmValue(params, 'utm_medium');
    const utmCampaign = utmValue(params, 'utm_campaign');
    return utmSource && utmMedium && utmCampaign ? { utmSource, utmMedium, utmCampaign } : null;
}

export function rememberCampaign(campaign: Campaign | null) {
    visitCampaign = campaign;
}

export function currentCampaign(): Campaign | null {
    return visitCampaign;
}

// The landing page's language: its locale segment (/el/...), otherwise the default.
export function pageLanguage(pathname: string): VisitorLanguage {
    const segment = pathname.split('/')[1];
    return (locales as readonly string[]).includes(segment) ? (segment as VisitorLanguage) : defaultLocale;
}

// Best effort: keepalive lets a click that leaves the page still arrive; a failure is ignored.
// `pathname` is the landing page it happened on; its locale segment is also the language.
export function sendCampaignVisit(kind: CampaignVisitKind, campaign: Campaign, pathname: string) {
    const body: CampaignVisitRequestDto = { kind, ...campaign, language: pageLanguage(pathname), page: pathname };
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${endpoints.campaignVisits.record}`, {
        method: 'POST',
        keepalive: true,
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).catch(() => undefined);
}

// A landing page click, counted for the campaign this visit arrived from.
export function sendCampaignClick(kind: Exclude<CampaignVisitKind, 'VISIT'>) {
    const campaign = currentCampaign();
    if (campaign) sendCampaignVisit(kind, campaign, window.location.pathname);
}
