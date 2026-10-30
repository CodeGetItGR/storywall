'use client';

import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { useOutreachSummary } from '@/hooks/useAdminOutreach';
import { useOutreachGuide } from '@/hooks/useOutreachGuide';
import { useOutreachSelection } from '@/hooks/useOutreachSelection';
import { useOutreachTable } from '@/hooks/useOutreachTable';

// token: which opening of the Add modal this is, so each one starts empty.
type AddState = { open: boolean; token: number };

const NO_CITIES: string[] = [];

export function useOutreachSection() {
    const summary = useOutreachSummary();
    const table = useOutreachTable();
    const selection = useOutreachSelection();
    const guide = useOutreachGuide();
    const [add, setAdd] = useState<AddState>({ open: false, token: 0 });
    const { openProspect } = selection;

    const cities = useMemo(() => summary.data?.byCity.map(({ city }) => city) ?? NO_CITIES, [summary.data]);

    const handleOpenClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const id = event.currentTarget.dataset.prospectId;
            if (id) openProspect(id);
        },
        [openProspect],
    );

    const handleAddClick = useCallback(() => setAdd((current) => ({ open: true, token: current.token + 1 })), []);
    const closeAdd = useCallback(() => setAdd((current) => ({ ...current, open: false })), []);

    // The modal lets go of its history entry once it has closed; the drawer's entry goes on after that.
    const openAfterAdd = useCallback(
        (id: string) => {
            closeAdd();
            window.setTimeout(() => openProspect(id), 0);
        },
        [closeAdd, openProspect],
    );

    return {
        summary: summary.data ?? null,
        summaryLoading: summary.isLoading,
        summaryError: summary.error,
        table,
        cities,
        selection,
        guide,
        add,
        handleOpenClick,
        handleAddClick,
        closeAdd,
        openAfterAdd,
    };
}
