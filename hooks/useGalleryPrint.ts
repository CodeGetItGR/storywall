'use client';

import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { usePrintAdd } from '@/hooks/usePrintAdd';
import { useHostPrintList, useHostPrintLists, usePatchPrintItem, usePrintPicksContext, useRemovePrintItem } from '@/hooks/usePrintLists';
import { usePrintPhotographer } from '@/hooks/usePrintPhotographer';
import { usePrintViewerToggle } from '@/hooks/usePrintViewerToggle';
import type { MediaResponseDto, PrintItemPatch } from '@/lib/api/types';
import { pickedMediaIds, printTotals } from '@/lib/printPicks';

// Whether the gallery offers print picks to the caller, read before useGalleryScreen
// so the screen knows who may select. Part A: hosts with an open photographer.
export function usePrintAvailability(eventId: string | null, isHost: boolean) {
    const context = usePrintPicksContext(eventId);
    const photographers = useMemo(() => context.data?.photographers ?? [], [context.data?.photographers]);
    return { available: isHost && photographers.length > 0, photographers };
}

type GalleryPrintInput = {
    eventId: string;
    isHost: boolean;
    available: boolean;
    photographers: ReturnType<typeof usePrintAvailability>['photographers'];
    media: MediaResponseDto[];
    selectedIds: Set<string>;
    viewerMedia: MediaResponseDto | null;
    onAdded: () => void;
};

// The gallery's print list: whose list, what is on it, and the actions on it.
export function useGalleryPrint({ eventId, isHost, available, photographers, media, selectedIds, viewerMedia, onAdded }: GalleryPrintInput) {
    const toErrorMessage = useApiErrorMessage();
    const [sheetOpen, setSheetOpen] = useState(false);

    const { photographer, vendorId, listKey, selectPhotographer } = usePrintPhotographer(eventId, photographers);
    // isHost stays in the gate: Part B adds guests, whose list comes from another query.
    const list = useHostPrintList(eventId, vendorId, available && isHost);
    // The pill stays while any photographer's list has prints, so the host can reach the other one.
    const vendorIds = useMemo(() => photographers.map((p) => p.vendorId), [photographers]);
    const allLists = useHostPrintLists(eventId, vendorIds, available && isHost);
    const showPill = allLists.some((query) => printTotals(query.data?.items ?? [], null).prints > 0);
    const { mutateAsync: patchAsync } = usePatchPrintItem(eventId, listKey);
    const { mutateAsync: removeAsync, isPending: isRemoving } = useRemovePrintItem(eventId, listKey);

    // A failed read must not look like "nothing picked yet". A refetch that fails keeps the data it had.
    const isLoadingList = list.isLoading;
    const listFailed = Boolean(list.error) && !list.data;
    const items = useMemo(() => list.data?.items ?? [], [list.data?.items]);
    const pickedIds = useMemo(() => pickedMediaIds(items), [items]);
    const totals = useMemo(
        () => printTotals(items, isHost ? (photographer?.hostPrintsIncluded ?? 0) : null),
        [items, isHost, photographer?.hostPrintsIncluded],
    );

    const { add, addSelected, isAdding, notice, error, setError } = usePrintAdd({ eventId, vendorId, media, selectedIds, pickedIds, onAdded });
    const viewerToggle = usePrintViewerToggle({
        eventId,
        vendorId,
        available,
        viewerMedia,
        items,
        add,
        removeAsync,
        pending: isAdding || isRemoving,
        disabled: isLoadingList || listFailed,
    });

    const updateItem = useCallback(
        async (itemId: string, patch: PrintItemPatch) => {
            setError(null);
            try {
                await patchAsync({ itemId, patch });
            } catch (patchError) {
                setError(toErrorMessage(patchError));
            }
        },
        [patchAsync, setError, toErrorMessage],
    );

    const deleteItem = useCallback(
        async (itemId: string) => {
            setError(null);
            try {
                await removeAsync(itemId);
            } catch (removeError) {
                setError(toErrorMessage(removeError));
            }
        },
        [removeAsync, setError, toErrorMessage],
    );

    const openSheet = useCallback(() => setSheetOpen(true), []);
    const closeSheet = useCallback(() => setSheetOpen(false), []);

    return {
        available,
        photographers,
        photographer,
        selectPhotographer,
        items,
        pickedIds,
        totals,
        pickCount: totals.prints,
        showPill,
        sheetOpen,
        openSheet,
        closeSheet,
        addSelected,
        isAdding,
        viewerToggle,
        updateItem,
        deleteItem,
        notice,
        // An action's error, else why the list could not be read.
        error: error ?? (listFailed ? toErrorMessage(list.error) : null),
        isLoadingList,
        listFailed,
    };
}
