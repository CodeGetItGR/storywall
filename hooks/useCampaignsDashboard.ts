'use client';

import { useLocale } from 'next-intl';
import { type MouseEvent, useCallback, useRef, useState } from 'react';

import { useAdminCampaigns } from '@/hooks/useAdminCampaigns';
import { useFunnelRange } from '@/hooks/useFunnelRange';
import type { CampaignLinkDto, CampaignRowDto } from '@/lib/api/types';
import { dateTimeFormat } from '@/lib/format';

// token: which opening this is. The drawer is keyed on it, so each opening starts fresh.
// link null with open true is the builder for a new link.
type DrawerState = { open: boolean; link: CampaignLinkDto | null; token: number };

const NO_ROWS: CampaignRowDto[] = [];

export function useCampaignsDashboard() {
    const locale = useLocale();
    const range = useFunnelRange();
    const { since, until, isValid } = range.bounds;
    const query = useAdminCampaigns(since, until, { enabled: isValid });
    const rows = (isValid ? query.data : undefined) ?? NO_ROWS;
    const [drawer, setDrawer] = useState<DrawerState>({ open: false, link: null, token: 0 });
    const nextToken = useRef(0);

    const updatedAt = query.dataUpdatedAt ? dateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(query.dataUpdatedAt) : null;

    const open = useCallback((link: CampaignLinkDto | null) => {
        nextToken.current += 1;
        setDrawer({ open: true, link, token: nextToken.current });
    }, []);

    const handleCreateClick = useCallback(() => open(null), [open]);

    const handleLinkClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const found = rows.find((row) => row.link?.id === event.currentTarget.dataset.linkId)?.link;
            if (found) open(found);
        },
        [open, rows],
    );

    const closeDrawer = useCallback(() => setDrawer((current) => ({ ...current, open: false })), []);

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
        drawer,
        handleCreateClick,
        handleLinkClick,
        closeDrawer,
    };
}
