import { instantToLocalInput } from '@/lib/adminPlanForm';
import type { CampaignDto, CampaignLinksRequestDto, CampaignRequestDto } from '@/lib/api/types';
import { toUtmValue } from '@/lib/campaignLinks';
import { datetimeLocalValueToIso } from '@/lib/datetime';

// The campaign drawer's form. Times are edited in the admin's own clock ("YYYY-MM-DDTHH:mm") and sent as
// instants. Limits mirror CampaignRequestDto; Spring checks everything else.

export const CAMPAIGN_FORM_NAME_MAX = 50;
export const CAMPAIGN_LABEL_MAX = 100;
export const CAMPAIGN_LINK_NAME_MAX = 60;

const GREEK_LETTERS: Readonly<Record<string, string>> = {
    α: 'a',
    β: 'v',
    γ: 'g',
    δ: 'd',
    ε: 'e',
    ζ: 'z',
    η: 'i',
    θ: 'th',
    ι: 'i',
    κ: 'k',
    λ: 'l',
    μ: 'm',
    ν: 'n',
    ξ: 'x',
    ο: 'o',
    π: 'p',
    ρ: 'r',
    σ: 's',
    ς: 's',
    τ: 't',
    υ: 'y',
    φ: 'f',
    χ: 'ch',
    ψ: 'ps',
    ω: 'o',
};

// Greek in Latin letters, lowercase and without accents: "Καλοκαίρι" → "kalokairi". Anything else is
// kept as it is.
export function transliterate(text: string): string {
    return text
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/ου/g, 'ou')
        .replace(/[α-ω]/g, (letter) => GREEK_LETTERS[letter] ?? letter);
}

// A link name from a campaign's name, as Spring takes it: Latin letters, lowercase, single dashes, no
// dash at either end.
export function suggestLinkName(name: string): string {
    return toUtmValue(transliterate(name))
        .replace(/-{2,}/g, '-')
        .slice(0, CAMPAIGN_LINK_NAME_MAX)
        .replace(/^[-._]+|[-._]+$/g, '');
}

export type CampaignForm = {
    name: string;
    linkName: string;
    startsAt: string;
    endsAt: string;
    discountOn: boolean;
    percent: string;
    label: string;
};

export const EMPTY_CAMPAIGN_FORM: CampaignForm = { name: '', linkName: '', startsAt: '', endsAt: '', discountOn: false, percent: '', label: '' };

export function formOfCampaign(campaign: CampaignDto): CampaignForm {
    return {
        name: campaign.name,
        linkName: campaign.linkName,
        startsAt: instantToLocalInput(campaign.startsAt),
        endsAt: instantToLocalInput(campaign.endsAt),
        discountOn: campaign.discount !== null,
        percent: campaign.discount ? String(campaign.discount.percent) : '',
        label: campaign.discount?.label ?? '',
    };
}

// The saved instant while the field still shows it. The field only holds minutes, and Spring reads any
// other instant as a change to the discount's dates, which a running discount refuses.
function instantOf(value: string, saved: string | null): string | null {
    if (saved !== null && value === instantToLocalInput(saved)) return saved;
    return datetimeLocalValueToIso(value);
}

// With a discount, the dates are the discount's. Links go with a new campaign only.
export function requestOfCampaignForm(form: CampaignForm, saved: CampaignDto | null, links: CampaignLinksRequestDto | null): CampaignRequestDto {
    return {
        name: form.name.trim(),
        linkName: form.linkName,
        startsAt: instantOf(form.startsAt, saved?.startsAt ?? null),
        endsAt: instantOf(form.endsAt, saved?.endsAt ?? null),
        discount: form.discountOn ? { percent: Number(form.percent), label: form.label.trim() || null } : null,
        links: saved ? null : links,
    };
}
