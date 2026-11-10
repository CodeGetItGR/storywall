'use client';

import { type ChangeEvent, type MouseEvent, useState } from 'react';

import {
    useArchiveCampaign,
    useCreateCampaign,
    useDeleteCampaign,
    useStopCampaignDiscount,
    useUnarchiveCampaign,
    useUpdateCampaign,
} from '@/hooks/useAdminCampaignApi';
import { useCampaignLinkPicker } from '@/hooks/useCampaignLinkPicker';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { CampaignDto, CampaignLinkDto } from '@/lib/api/types';
import {
    CAMPAIGN_LINK_NAME_MAX,
    type CampaignForm,
    EMPTY_CAMPAIGN_FORM,
    formOfCampaign,
    requestOfCampaignForm,
    suggestLinkName,
} from '@/lib/campaignForm';
import { toUtmValue } from '@/lib/campaignLinks';

export type CampaignConfirmation = 'stop' | 'archive' | 'unarchive' | 'delete';

type TextField = 'percent' | 'label';

// The server names the plans, in the admin's language, so its text is shown as it is.
function priceTooLowDetail(error: unknown): string | null {
    if (getErrorCode(error) !== ERROR_CODES.DISCOUNT_CAMPAIGN_PRICE_TOO_LOW) return null;
    return (error instanceof ApiError && error.problem?.detail) || null;
}

// The campaign drawer's state and actions: a new campaign with its first links, or a saved one with
// its record actions. The drawer is remounted on every opening, so the form starts from the saved
// values. Marketing (canEditDiscount false) sees the discount but can't change it.
export function useCampaignForm({
    campaign,
    links,
    deletable,
    canEditDiscount,
    onDone,
    onCreated,
    onDeleted,
}: {
    campaign: CampaignDto | null;
    links: readonly CampaignLinkDto[];
    deletable: boolean;
    canEditDiscount: boolean;
    onDone: () => void;
    onCreated: (id: string) => void;
    onDeleted: () => void;
}) {
    const create = useCreateCampaign();
    const update = useUpdateCampaign();
    const stop = useStopCampaignDiscount();
    const archive = useArchiveCampaign();
    const unarchive = useUnarchiveCampaign();
    const remove = useDeleteCampaign();
    const [form, setForm] = useState<CampaignForm>(() => (campaign ? formOfCampaign(campaign) : EMPTY_CAMPAIGN_FORM));
    // A saved campaign's link name is never suggested again.
    const [linkNameTouched, setLinkNameTouched] = useState(campaign !== null);
    // The kind stays set while the confirmation closes, so its words don't change mid-animation.
    const [confirmation, setConfirmation] = useState<CampaignConfirmation>('archive');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const picker = useCampaignLinkPicker(form.linkName, links);

    const confirming = stop.isPending || archive.isPending || unarchive.isPending || remove.isPending;
    const busy = create.isPending || update.isPending || confirming;
    const status = campaign?.status ?? null;
    const discountStatus = campaign?.discount?.status ?? null;
    // A discount that ended or was stopped stays as it was.
    const discountLocked = !canEditDiscount || discountStatus === 'ENDED' || discountStatus === 'OFF';
    // A saved discount can only be taken off before it starts; after that, Stop discount ends it.
    const toggleLocked = discountLocked || (discountStatus !== null && discountStatus !== 'SCHEDULED');
    // With a discount, the dates are the discount's.
    const datesLocked = form.discountOn && discountLocked;

    function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
        const name = event.currentTarget.value;
        setForm((current) => ({ ...current, name, linkName: linkNameTouched ? current.linkName : suggestLinkName(name) }));
    }

    function handleLinkNameChange(event: ChangeEvent<HTMLInputElement>) {
        const linkName = toUtmValue(event.currentTarget.value).slice(0, CAMPAIGN_LINK_NAME_MAX);
        setLinkNameTouched(true);
        setForm((current) => ({ ...current, linkName }));
    }

    function handleTextChange(event: ChangeEvent<HTMLInputElement>) {
        const field = event.currentTarget.name as TextField;
        const value = event.currentTarget.value;
        setForm((current) => ({ ...current, [field]: value }));
    }

    function setStartsAt(startsAt: string) {
        setForm((current) => ({ ...current, startsAt }));
    }

    function setEndsAt(endsAt: string) {
        setForm((current) => ({ ...current, endsAt }));
    }

    function setDiscountOn(discountOn: boolean) {
        setForm((current) => ({ ...current, discountOn }));
    }

    async function save() {
        setError(null);
        try {
            const input = requestOfCampaignForm(form, campaign, picker.request);
            if (campaign) {
                await update.mutateAsync({ id: campaign.id, input });
                onDone();
            } else {
                const created = await create.mutateAsync(input);
                onCreated(created.id);
            }
        } catch (caught) {
            setError(caught);
        }
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        // A ticked Partner or Other needs its typed values first.
        if (!campaign && !picker.validate()) return;
        void save();
    }

    // Each record action's button carries its kind as its value.
    function handleConfirmationClick(event: MouseEvent<HTMLButtonElement>) {
        setConfirmation(event.currentTarget.value as CampaignConfirmation);
        setConfirmOpen(true);
    }

    function closeConfirmation() {
        setConfirmOpen(false);
    }

    async function confirmAction() {
        if (!campaign) return;
        setError(null);
        try {
            if (confirmation === 'delete') {
                await remove.mutateAsync(campaign.id);
                setConfirmOpen(false);
                onDeleted();
                return;
            }
            if (confirmation === 'stop') await stop.mutateAsync(campaign.id);
            else if (confirmation === 'archive') await archive.mutateAsync(campaign.id);
            else await unarchive.mutateAsync(campaign.id);
            setConfirmOpen(false);
            onDone();
        } catch (caught) {
            setConfirmOpen(false);
            setError(caught);
        }
    }

    return {
        form,
        picker,
        busy,
        confirming,
        discountLocked,
        toggleLocked,
        datesLocked,
        // A running discount's start can't move.
        startLocked: datesLocked || discountStatus === 'LIVE',
        // The link name is in every link's address, so it's fixed once there are links or a discount.
        linkNameLocked: campaign !== null && (campaign.linkCount > 0 || campaign.discount !== null),
        canStop: canEditDiscount && discountStatus === 'LIVE',
        // A campaign with a discount still to run or running stays in Current.
        canArchive: campaign !== null && status !== 'ARCHIVED' && discountStatus !== 'LIVE' && discountStatus !== 'SCHEDULED',
        canUnarchive: status === 'ARCHIVED',
        canDelete: deletable && (discountStatus === null || canEditDiscount),
        error,
        errorDetail: priceTooLowDetail(error),
        confirmation,
        confirmOpen,
        handleNameChange,
        handleLinkNameChange,
        handleTextChange,
        setStartsAt,
        setEndsAt,
        setDiscountOn,
        handleSubmit,
        handleConfirmationClick,
        closeConfirmation,
        confirmAction,
    };
}
