'use client';

import { useLocale } from 'next-intl';
import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';

import { useAdminCampaigns } from '@/hooks/useAdminCampaigns';
import { useAdminRecordPage } from '@/hooks/useAdminRecordPage';
import { useFunnelRange } from '@/hooks/useFunnelRange';
import { CAMPAIGNS_HASH_ROOT } from '@/lib/adminRecordRouting';
import type { CampaignLinkDto, CampaignLinkLanguage, CampaignRowDto } from '@/lib/api/types';
import { dateTimeFormat } from '@/lib/format';

// token: which opening this is. The drawer that creates a language's set of links is keyed on it, so
// each opening starts fresh.
type LinkSetState = { open: boolean; language: CampaignLinkLanguage; token: number };

const NO_ROWS: CampaignRowDto[] = [];

export function useCampaignsDashboard() {
    const locale = useLocale();
    const range = useFunnelRange();
    const { since, until, isValid } = range.bounds;
    const query = useAdminCampaigns(since, until, { enabled: isValid });
    const rows = (isValid ? query.data : undefined) ?? NO_ROWS;
    const page = useAdminRecordPage(CAMPAIGNS_HASH_ROOT);
    const { recordId, replace, showList } = page;
    // A link just saved opens before the report has refetched with it.
    const [createdLink, setCreatedLink] = useState<CampaignLinkDto | null>(null);
    const [linkSet, setLinkSet] = useState<LinkSetState>({ open: false, language: 'el', token: 0 });
    const nextToken = useRef(0);

    const updatedAt = query.dataUpdatedAt ? dateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(query.dataUpdatedAt) : null;

    const link = recordId ? (rows.find((row) => row.link?.id === recordId)?.link ?? (createdLink?.id === recordId ? createdLink : null)) : null;
    const missing = recordId !== null && !query.isLoading && !link;

    // A deleted link, or an address that never was one, shows the list.
    useEffect(() => {
        if (missing) showList();
    }, [missing, showList]);

    const handleLinkCreated = useCallback(
        (created: CampaignLinkDto) => {
            setCreatedLink(created);
            replace(created.id);
        },
        [replace],
    );

    const handleLinkSetClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const language = event.currentTarget.dataset.language as CampaignLinkLanguage;
        nextToken.current += 1;
        setLinkSet({ open: true, language, token: nextToken.current });
    }, []);

    const closeLinkSet = useCallback(() => setLinkSet((current) => ({ ...current, open: false })), []);

    const { refetch } = query;
    const refresh = useCallback(() => void refetch(), [refetch]);

    return {
        range,
        rows,
        hasData: isValid && query.data !== undefined,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        updatedAt,
        refresh,
        page,
        link,
        handleLinkCreated,
        linkSet,
        handleLinkSetClick,
        closeLinkSet,
    };
}
