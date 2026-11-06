'use client';

import { useMemo, useRef, useState } from 'react';

import { useAdminCampaigns, useGenerateCampaignLinkSet } from '@/hooks/useAdminCampaigns';
import type { AdminDiscountCampaignDto, CampaignLinkLanguage, CampaignRowDto } from '@/lib/api/types';
import { CAMPAIGN_SET_SIZE, campaignLinkSections, campaignSetLinkLanguage, totalOf } from '@/lib/campaignLinks';
import { isCampaignOver } from '@/lib/discountCampaignForm';

const NO_ROWS: CampaignRowDto[] = [];

// One discount campaign's links in the chosen language, counted over all time, and the button that
// creates what that language is missing. It opens on Greek, the set every campaign starts with. A
// repeat click creates nothing, and a click while a request is running is ignored: the server answers
// a second request at the same moment with a 409. The ref closes the gap before the mutation reports
// it is pending, so two clicks in a row send one request.
export function useDiscountCampaignLinks(campaign: Pick<AdminDiscountCampaignDto, 'name' | 'linkName' | 'status'>) {
    const query = useAdminCampaigns(null, null, { refetchOnMount: 'always' });
    const generate = useGenerateCampaignLinkSet();
    const [language, setLanguage] = useState<CampaignLinkLanguage>('el');
    const [error, setError] = useState<unknown>(null);
    const inFlight = useRef(false);
    const allRows = query.data ?? NO_ROWS;
    const campaignRows = useMemo(() => allRows.filter((row) => row.link?.linkGroup === campaign.linkName), [allRows, campaign.linkName]);
    const rows = useMemo(() => campaignRows.filter((row) => row.link && campaignSetLinkLanguage(row.link) === language), [campaignRows, language]);

    const sections = useMemo(() => campaignLinkSections(rows), [rows]);
    const total = useMemo(() => totalOf(rows), [rows]);

    function handleLanguageChange(next: CampaignLinkLanguage) {
        setLanguage(next);
        setError(null);
    }

    function handleGenerateClick() {
        if (inFlight.current || generate.isPending) return;
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
    const hasLinks = campaignRows.length > 0;
    const missingLinks = !over && !query.isLoading && rows.length < CAMPAIGN_SET_SIZE;

    return {
        language,
        rows,
        sections,
        total,
        over,
        hasLinks,
        missingLinks,
        isLoading: query.isLoading,
        busy: generate.isPending,
        error: error ?? query.error,
        handleLanguageChange,
        handleGenerateClick,
    };
}
