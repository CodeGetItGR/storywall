'use client';

import { useCallback, useState } from 'react';

import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { useAdminBugReports } from '@/hooks/useAdminBetaFeedback';

export function useBugReportsPanel() {
    const { sendTo } = useAdminNavigation();
    const [page, setPage] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const reportsQuery = useAdminBugReports(page);

    const openReport = useCallback((id: string) => setSelectedId(id), []);
    const closeReport = useCallback(() => setSelectedId(null), []);

    // A failed call's ref leads to the grouped error it was recorded under.
    const openErrorRef = useCallback((errorRef: string) => sendTo('errorEvents', { errorRef }), [sendTo]);

    return { page, setPage, selectedId, openReport, closeReport, openErrorRef, reportsQuery };
}
