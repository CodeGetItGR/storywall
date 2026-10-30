'use client';

import { type MouseEvent, useCallback, useEffect, useState } from 'react';

import { usePartnerApplications } from '@/hooks/useAdminPartnerApplications';
import { formatPartnerApplicationsHash, parsePartnerApplicationsHash } from '@/lib/adminPartnerApplicationsRouting';
import type { PartnerApplicationStatus } from '@/lib/api/types';
import { pushPageEntry } from '@/lib/overlayHistory';

function currentApplicationId(): string | null {
    return typeof window === 'undefined' ? null : parsePartnerApplicationsHash(window.location.hash);
}

// The list's filter and page live here, so they survive a trip to a detail page and back.
export function usePartnerApplicationsPanel() {
    const [status, setStatus] = useState<PartnerApplicationStatus | null>('PENDING');
    const [page, setPage] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(currentApplicationId);
    const query = usePartnerApplications(status, page);

    useEffect(() => {
        function syncFromHash() {
            setSelectedId(currentApplicationId());
        }
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    // The segmented control can't hold null, so "All" travels as 'all'.
    const handleStatusChange = useCallback((value: string) => {
        setStatus(value === 'all' ? null : (value as PartnerApplicationStatus));
        setPage(0);
    }, []);

    // Next's Link sets the hash with pushState, which fires no hashchange.
    const handleBackClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        pushPageEntry(formatPartnerApplicationsHash(null));
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, []);

    return {
        status,
        handleStatusChange,
        page,
        setPage,
        selectedId,
        rows: query.data?.content ?? [],
        pageInfo: query.data?.page ?? null,
        isLoading: query.isLoading,
        error: query.error,
        handleBackClick,
    };
}
