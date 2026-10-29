'use client';

import { type ChangeEvent, useState } from 'react';

import { useDeleteCampaignLink, useRenameCampaignLink } from '@/hooks/useAdminCampaigns';
import type { CampaignLinkDto } from '@/lib/api/types';
import { CAMPAIGN_NAME_MAX, campaignUrl } from '@/lib/campaignLinks';

// One saved campaign link: copy it, rename it, or delete it. Only the name changes, so a link
// already shared keeps counting under the same values.
export function useCampaignLinkDetail(link: CampaignLinkDto, onDone: () => void) {
    const rename = useRenameCampaignLink();
    const remove = useDeleteCampaignLink();
    const [name, setName] = useState(link.name);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [showProblem, setShowProblem] = useState(false);

    const trimmed = name.trim();
    const nameInvalid = !trimmed || trimmed.length > CAMPAIGN_NAME_MAX;
    const busy = rename.isPending || remove.isPending;

    function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
        setName(event.currentTarget.value);
    }

    async function save() {
        if (nameInvalid) {
            setShowProblem(true);
            return;
        }
        setError(null);
        try {
            if (trimmed !== link.name) await rename.mutateAsync({ id: link.id, name: trimmed });
            onDone();
        } catch (caught) {
            setError(caught);
        }
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        void save();
    }

    function openDeleteConfirmation() {
        setConfirmDelete(true);
    }

    function closeDeleteConfirmation() {
        setConfirmDelete(false);
    }

    async function confirmDeletion() {
        setError(null);
        try {
            await remove.mutateAsync(link.id);
            setConfirmDelete(false);
            onDone();
        } catch (caught) {
            setConfirmDelete(false);
            setError(caught);
        }
    }

    return {
        name,
        url: campaignUrl(link),
        nameProblem: showProblem && nameInvalid,
        busy,
        deleting: remove.isPending,
        error,
        confirmDelete,
        handleNameChange,
        handleSubmit,
        openDeleteConfirmation,
        closeDeleteConfirmation,
        confirmDeletion,
    };
}
