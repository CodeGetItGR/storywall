import { instantToLocalInput } from '@/lib/adminPlanForm';
import type { AdminDiscountCampaignDto, DiscountCampaignRequestDto } from '@/lib/api/types';
import { datetimeLocalValueToIso } from '@/lib/datetime';

// The admin drawer's form for one discount campaign. Times are edited in the admin's own clock
// ("YYYY-MM-DDTHH:mm") and sent as instants. Limits mirror DiscountCampaignService, which checks
// everything else.

export const DISCOUNT_CAMPAIGN_NAME_MAX = 50;
export const DISCOUNT_CAMPAIGN_LABEL_MAX = 100;
export const DISCOUNT_CAMPAIGN_LINK_NAME_MAX = 60;

export type DiscountCampaignForm = {
    name: string;
    percent: string;
    label: string;
    linkName: string;
    startsAt: string;
    endsAt: string;
};

export const EMPTY_DISCOUNT_CAMPAIGN_FORM: DiscountCampaignForm = { name: '', percent: '', label: '', linkName: '', startsAt: '', endsAt: '' };

export function formOfCampaign(campaign: AdminDiscountCampaignDto): DiscountCampaignForm {
    return {
        name: campaign.name,
        percent: String(campaign.percent),
        label: campaign.label ?? '',
        linkName: campaign.linkName,
        startsAt: instantToLocalInput(campaign.startsAt),
        endsAt: instantToLocalInput(campaign.endsAt),
    };
}

export function requestOfCampaignForm(form: DiscountCampaignForm): DiscountCampaignRequestDto {
    return {
        name: form.name.trim(),
        percent: Number(form.percent),
        label: form.label.trim() || null,
        linkName: form.linkName,
        startsAt: datetimeLocalValueToIso(form.startsAt),
        // The field is required, so the browser only submits it filled in.
        endsAt: datetimeLocalValueToIso(form.endsAt) ?? '',
    };
}
