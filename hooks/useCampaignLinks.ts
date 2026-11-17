'use client';

import { type ChangeEvent, type MouseEvent, useMemo, useState } from 'react';

import { useAddCampaignLinks, useDeleteCampaignLink, useMoveCampaignLink } from '@/hooks/useAdminCampaignApi';
import { useCampaignLinkPicker } from '@/hooks/useCampaignLinkPicker';
import { useCampaignLinkWords } from '@/hooks/useCampaignLinkWords';
import type { CampaignDto, CampaignLinkDto, CampaignLinksRequestDto } from '@/lib/api/types';
import { CAMPAIGN_PLATFORMS, campaignLinkLabel, type CampaignLinkLabelParts, campaignLinkPlatform, campaignLinkShareUrl } from '@/lib/campaignLinks';

export type CampaignLinksMode = 'list' | 'add' | 'link';

// A row of the links drawer: the link, its marks, its name in words and the address to copy.
export type CampaignLinkRow = { link: CampaignLinkDto; label: CampaignLinkLabelParts; name: string; url: string };

// The links drawer: the campaign's links by platform, one link opened in place to share, move or delete
// it, and the picker to add more.
export function useCampaignLinks(campaign: CampaignDto, links: readonly CampaignLinkDto[], others: readonly CampaignDto[]) {
    const words = useCampaignLinkWords();
    const add = useAddCampaignLinks();
    const move = useMoveCampaignLink();
    const remove = useDeleteCampaignLink();
    const picker = useCampaignLinkPicker(campaign.linkName, links);
    const [mode, setMode] = useState<CampaignLinksMode>('list');
    const [linkId, setLinkId] = useState<string | null>(null);
    const [moveTarget, setMoveTarget] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const linkWords = words.link;
    const rows = useMemo<CampaignLinkRow[]>(() => {
        const order = (link: CampaignLinkDto) => CAMPAIGN_PLATFORMS.indexOf(campaignLinkPlatform(link));
        return [...links]
            .sort((a, b) => order(a) - order(b))
            .map((link) => {
                const label = campaignLinkLabel(link, links);
                return { link, label, name: linkWords(label), url: campaignLinkShareUrl(link) };
            });
    }, [linkWords, links]);

    const moveOptions = useMemo(() => [...others].sort((a, b) => a.name.localeCompare(b.name)), [others]);
    const selected = rows.find((row) => row.link.id === linkId) ?? null;
    const busy = add.isPending || move.isPending || remove.isPending;
    // An archived or ended campaign takes no new links.
    const addLocked = campaign.status === 'ARCHIVED' || campaign.status === 'ENDED';

    function showList() {
        setMode('list');
        setLinkId(null);
        setError(null);
    }

    function showAdd() {
        picker.reset();
        setError(null);
        setMode('add');
    }

    // Each row's button carries its link's id as its value.
    function handleRowClick(event: MouseEvent<HTMLButtonElement>) {
        setLinkId(event.currentTarget.value);
        setMoveTarget('');
        setError(null);
        setMode('link');
    }

    function handleMoveTargetChange(event: ChangeEvent<HTMLSelectElement>) {
        setMoveTarget(event.currentTarget.value);
    }

    // The select shows the first campaign until another is picked.
    const target = moveTarget || (moveOptions[0]?.id ?? '');

    async function moveLink() {
        if (!selected || !target) return;
        setError(null);
        try {
            await move.mutateAsync({ id: selected.link.id, campaignId: target });
            showList();
        } catch (caught) {
            setError(caught);
        }
    }

    function handleMoveClick() {
        void moveLink();
    }

    function openDelete() {
        setDeleting(true);
    }

    function closeDelete() {
        setDeleting(false);
    }

    async function deleteLink() {
        if (!selected) return;
        setError(null);
        try {
            await remove.mutateAsync(selected.link.id);
            setDeleting(false);
            showList();
        } catch (caught) {
            setDeleting(false);
            setError(caught);
        }
    }

    async function addLinks(input: CampaignLinksRequestDto) {
        setError(null);
        try {
            await add.mutateAsync({ id: campaign.id, input });
            showList();
        } catch (caught) {
            setError(caught);
        }
    }

    function handleAddSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy || !picker.validate() || !picker.request) return;
        void addLinks(picker.request);
    }

    return {
        mode,
        rows,
        selected,
        moveOptions,
        moveTarget: target,
        picker,
        busy,
        addLocked,
        removing: remove.isPending,
        deleting,
        error,
        showList,
        showAdd,
        handleRowClick,
        handleMoveTargetChange,
        handleMoveClick,
        openDelete,
        closeDelete,
        deleteLink,
        handleAddSubmit,
    };
}
