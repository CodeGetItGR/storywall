'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAdminWithdrawals } from '@/hooks/useAdmin';
import { formatWithdrawalsHash, parseWithdrawalsHash } from '@/lib/adminWithdrawalsRouting';

function currentRequestId(): string | null {
    return typeof window === 'undefined' ? null : parseWithdrawalsHash(window.location.hash);
}

// The held requests as a list; the hash picks the detail page.
export function useWithdrawalsPanel() {
    const query = useAdminWithdrawals();
    const [selectedId, setSelectedId] = useState<string | null>(currentRequestId);

    useEffect(() => {
        function syncFromHash() {
            setSelectedId(currentRequestId());
        }
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    // A released request leaves the queue, so its page has nothing left to show.
    const backToList = useCallback(() => {
        window.location.hash = formatWithdrawalsHash(null);
    }, []);

    const refresh = useCallback(() => {
        query.refetch();
    }, [query]);

    const rows = query.data ?? [];

    return {
        rows,
        selectedId,
        selectedRow: rows.find((row) => row.request.id === selectedId) ?? null,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        refresh,
        backToList,
    };
}
