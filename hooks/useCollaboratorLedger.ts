'use client';

import { type ChangeEvent, type MouseEvent, useCallback, useMemo, useState } from 'react';

import { useCollaboratorEarnings, useMarkCollaborationEarningsPaid, useVoidCollaborationRedemption } from '@/hooks/useAdmin';
import { type EarningFilter, filterEarnings, sortEarningsNewestFirst, sumByCurrency, voidableEarningIds } from '@/lib/adminCollaborations';
import type { CollaborationEarningResponseDto } from '@/lib/api/types';

const EMPTY_EARNINGS: CollaborationEarningResponseDto[] = [];

export function useCollaboratorLedger(collaboratorId: string) {
    const earningsQuery = useCollaboratorEarnings(collaboratorId);
    const markPaid = useMarkCollaborationEarningsPaid();
    const voidRedemption = useVoidCollaborationRedemption();
    const [filter, setFilter] = useState<EarningFilter>('OPEN');
    const [pickedIds, setPickedIds] = useState<string[]>([]);
    const [markPaidOpen, setMarkPaidOpen] = useState(false);
    const [reference, setReference] = useState('');
    const [voidTargetId, setVoidTargetId] = useState<string | null>(null);
    const [voidReason, setVoidReason] = useState('');

    const earnings = useMemo(() => sortEarningsNewestFirst(earningsQuery.data ?? EMPTY_EARNINGS), [earningsQuery.data]);
    const visibleEarnings = useMemo(() => filterEarnings(earnings, filter), [earnings, filter]);
    const selectableIds = useMemo(
        () => visibleEarnings.filter((earning) => earning.status === 'ACCRUED').map((earning) => earning.id),
        [visibleEarnings],
    );
    // Only rows still payable after a refetch count, so a 5062 retry never resends a row that is already PAID or REVERSED.
    const selectedIds = useMemo(() => pickedIds.filter((id) => selectableIds.includes(id)), [pickedIds, selectableIds]);
    const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));
    const selectionTotals = useMemo(() => sumByCurrency(earnings.filter((earning) => selectedIds.includes(earning.id))), [earnings, selectedIds]);
    const voidableIds = useMemo(() => voidableEarningIds(earnings), [earnings]);
    const voidTarget = earnings.find((earning) => earning.id === voidTargetId) ?? null;

    // A filter change hides rows, so it drops the selection instead of paying rows no longer on screen.
    const handleFilterClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        setFilter(event.currentTarget.dataset.filter as EarningFilter);
        setPickedIds([]);
    }, []);

    const handleToggle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const { value: id, checked } = event.currentTarget;
        setPickedIds((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
    }, []);

    const handleToggleAll = useCallback(() => setPickedIds(allSelected ? [] : selectableIds), [allSelected, selectableIds]);
    const clearSelection = useCallback(() => setPickedIds([]), []);

    const openMarkPaid = useCallback(() => {
        markPaid.reset();
        setMarkPaidOpen(true);
    }, [markPaid]);

    const closeMarkPaid = useCallback(() => {
        setMarkPaidOpen(false);
        setReference('');
    }, []);

    const handleReferenceChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setReference(event.target.value), []);

    const confirmMarkPaid = useCallback(async () => {
        try {
            await markPaid.mutateAsync({ earningIds: selectedIds, payoutReference: reference.trim() });
            setPickedIds([]);
            closeMarkPaid();
        } catch {
            // Shown in the modal; the settled invalidation refetches the ledger.
        }
    }, [closeMarkPaid, markPaid, reference, selectedIds]);

    const handleVoidClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            voidRedemption.reset();
            setVoidTargetId(event.currentTarget.dataset.earningId ?? null);
        },
        [voidRedemption],
    );

    const closeVoid = useCallback(() => {
        setVoidTargetId(null);
        setVoidReason('');
    }, []);

    const handleVoidReasonChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setVoidReason(event.target.value), []);

    // Voiding reverses every row of that event, so the whole selection is dropped.
    const confirmVoid = useCallback(async () => {
        if (!voidTarget) return;
        try {
            await voidRedemption.mutateAsync({ eventId: voidTarget.eventId, input: { reason: voidReason.trim() } });
            setPickedIds([]);
            closeVoid();
        } catch {
            // Shown in the modal.
        }
    }, [closeVoid, voidReason, voidRedemption, voidTarget]);

    return {
        isLoading: earningsQuery.isLoading,
        error: earningsQuery.error,
        filter,
        handleFilterClick,
        visibleEarnings,
        selectedIds,
        selectableCount: selectableIds.length,
        allSelected,
        handleToggle,
        handleToggleAll,
        clearSelection,
        selectionTotals,
        markPaidOpen,
        openMarkPaid,
        closeMarkPaid,
        reference,
        handleReferenceChange,
        confirmMarkPaid,
        canMarkPaid: reference.trim().length > 0,
        markPaidPending: markPaid.isPending,
        markPaidError: markPaid.error,
        voidableIds,
        voidOpen: Boolean(voidTarget),
        closeVoid,
        handleVoidClick,
        voidReason,
        handleVoidReasonChange,
        confirmVoid,
        canVoid: voidReason.trim().length > 0,
        voidPending: voidRedemption.isPending,
        voidError: voidRedemption.error,
    };
}
