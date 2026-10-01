'use client';

import type React from 'react';
import { useCallback, useState } from 'react';

import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { useAdminErrorEvents } from '@/hooks/useAdminBetaFeedback';
import { isErrorRef } from '@/lib/adminBetaFeedback';
import type { ErrorEventResponseDto, ErrorEventSource } from '@/lib/api/types';

export function useErrorEventsPanel() {
    const { focus } = useAdminNavigation();
    const [page, setPage] = useState(0);
    const [source, setSourceState] = useState<ErrorEventSource | null>(null);
    // Arriving from a bug report pre-fills the ref filter.
    const [refInput, setRefInput] = useState(focus?.errorRef ?? '');
    const [selected, setSelected] = useState<ErrorEventResponseDto | null>(null);

    const normalizedRef = refInput.trim().toLowerCase();
    const appliedRef = isErrorRef(normalizedRef) ? normalizedRef : '';
    const refInvalid = normalizedRef.length > 0 && !appliedRef;
    const eventsQuery = useAdminErrorEvents({ page, source, ref: appliedRef });

    const setSource = useCallback((next: ErrorEventSource | null) => {
        setSourceState(next);
        setPage(0);
    }, []);

    const handleRefChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRefInput(event.target.value);
        setPage(0);
    }, []);

    const clearRef = useCallback(() => {
        setRefInput('');
        setPage(0);
    }, []);

    const openEvent = useCallback((event: ErrorEventResponseDto) => setSelected(event), []);
    const closeEvent = useCallback(() => setSelected(null), []);

    return {
        page,
        setPage,
        source,
        setSource,
        refInput,
        refInvalid,
        appliedRef,
        handleRefChange,
        clearRef,
        selected,
        openEvent,
        closeEvent,
        eventsQuery,
    };
}
