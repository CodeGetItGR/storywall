'use client';

import { type MouseEvent, useMemo, useRef, useState } from 'react';

import { useAdminCampaigns, useGenerateCampaignLinkSet } from '@/hooks/useAdminCampaigns';
import type { AdminDiscountCampaignDto, CampaignLinkLanguage, CampaignRowDto } from '@/lib/api/types';
import { campaignLinkSections, totalOf } from '@/lib/campaignLinks';
import { isCampaignOver } from '@/lib/discountCampaignForm';

const NO_ROWS: CampaignRowDto[] = [];

// One discount campaign's links on its page, counted over all time, and the two buttons that
// create a language's set. A repeat click creates nothing, and a click while a request is running
// is ignored: the server answers a second request at the same moment with a 409. The ref closes the
// gap before the mutation reports it is pending, so two clicks in a row send one request.
export function useDiscountCampaignLinks(campaign: Pick<AdminDiscountCampaignDto, 'name' | 'linkName' | 'status'>) {
    const query = useAdminCampaigns(null, null, { refetchOnMount: 'always' });
    const generate = useGenerateCampaignLinkSet();
    const [error, setError] = useState<unknown>(null);
    const inFlight = useRef(false);
    const allRows = query.data ?? NO_ROWS;
    const rows = useMemo(() => allRows.filter((row) => row.link?.linkGroup === campaign.linkName), [allRows, campaign.linkName]);

    const sections = useMemo(() => campaignLinkSections(rows), [rows]);
    const total = useMemo(() => totalOf(rows), [rows]);

    function handleGenerateClick(event: MouseEvent<HTMLButtonElement>) {
        if (inFlight.current || generate.isPending) return;
        const language = event.currentTarget.dataset.language as CampaignLinkLanguage;
        inFlight.current = true;
        setError(null);
        generate
            .mutateAsync({ name: campaign.name, linkName: campaign.linkName, language })
            .catch(setError)
            .finally(() => {
                inFlight.current = false;
            });
    }

    // An over campaign keeps its links listed, but gets no new ones and a warning not to use them.
    const over = isCampaignOver(campaign.status);

    return { rows, sections, total, over, isLoading: query.isLoading, busy: generate.isPending, error: error ?? query.error, handleGenerateClick };
}
