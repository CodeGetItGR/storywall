'use client';

import { type ChangeEvent, useState } from 'react';

import {
    useCreateDiscountCampaign,
    useDeleteDiscountCampaign,
    useStopDiscountCampaign,
    useUpdateDiscountCampaign,
} from '@/hooks/useAdminDiscountCampaigns';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';
import { toUtmValue } from '@/lib/campaignLinks';
import {
    DISCOUNT_CAMPAIGN_LINK_NAME_MAX,
    type DiscountCampaignForm,
    EMPTY_DISCOUNT_CAMPAIGN_FORM,
    formOfCampaign,
    requestOfCampaignForm,
} from '@/lib/discountCampaignForm';

type TextField = 'name' | 'percent' | 'label';
type Confirmation = 'stop' | 'delete' | null;

// The server names the plans, in the admin's language, so its text is shown as it is.
function priceTooLowDetail(error: unknown): string | null {
    if (getErrorCode(error) !== ERROR_CODES.DISCOUNT_CAMPAIGN_PRICE_TOO_LOW) return null;
    return (error instanceof ApiError && error.problem?.detail) || null;
}

// The discount campaign drawer's state and actions. The drawer is remounted on every opening, so
// the form starts from the campaign's saved values (or the empty form).
export function useDiscountCampaignForm(campaign: AdminDiscountCampaignDto | null, onDone: () => void) {
    const create = useCreateDiscountCampaign();
    const update = useUpdateDiscountCampaign();
    const stop = useStopDiscountCampaign();
    const remove = useDeleteDiscountCampaign();
    const [form, setForm] = useState<DiscountCampaignForm>(() => (campaign ? formOfCampaign(campaign) : EMPTY_DISCOUNT_CAMPAIGN_FORM));
    const [confirmation, setConfirmation] = useState<Confirmation>(null);
    const [error, setError] = useState<unknown>(null);

    const busy = create.isPending || update.isPending || stop.isPending || remove.isPending;
    const status = campaign?.status ?? null;
    const readOnly = status === 'ENDED' || status === 'OFF';

    function handleTextChange(event: ChangeEvent<HTMLInputElement>) {
        const field = event.currentTarget.name as TextField;
        const value = event.currentTarget.value;
        setForm((current) => ({ ...current, [field]: value }));
    }

    function handleLinkNameChange(event: ChangeEvent<HTMLInputElement>) {
        const linkName = toUtmValue(event.currentTarget.value).slice(0, DISCOUNT_CAMPAIGN_LINK_NAME_MAX);
        setForm((current) => ({ ...current, linkName }));
    }

    function setStartsAt(startsAt: string) {
        setForm((current) => ({ ...current, startsAt }));
    }

    function setEndsAt(endsAt: string) {
        setForm((current) => ({ ...current, endsAt }));
    }

    async function save() {
        setError(null);
        try {
            const input = requestOfCampaignForm(form);
            if (campaign) await update.mutateAsync({ id: campaign.id, input });
            else await create.mutateAsync(input);
            onDone();
        } catch (caught) {
            setError(caught);
        }
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy || readOnly) return;
        void save();
    }

    function openStopConfirmation() {
        setConfirmation('stop');
    }

    function openDeleteConfirmation() {
        setConfirmation('delete');
    }

    function closeConfirmation() {
        setConfirmation(null);
    }

    async function confirmAction() {
        if (!campaign || !confirmation) return;
        setError(null);
        try {
            if (confirmation === 'stop') await stop.mutateAsync(campaign.id);
            else await remove.mutateAsync(campaign.id);
            setConfirmation(null);
            onDone();
        } catch (caught) {
            setConfirmation(null);
            setError(caught);
        }
    }

    return {
        form,
        busy,
        confirming: stop.isPending || remove.isPending,
        readOnly,
        canStop: status === 'LIVE',
        canDelete: status === 'SCHEDULED',
        linkNameLocked: campaign !== null,
        startLocked: status === 'LIVE',
        error,
        errorDetail: priceTooLowDetail(error),
        confirmation,
        handleTextChange,
        handleLinkNameChange,
        setStartsAt,
        setEndsAt,
        handleSubmit,
        openStopConfirmation,
        openDeleteConfirmation,
        closeConfirmation,
        confirmAction,
    };
}
