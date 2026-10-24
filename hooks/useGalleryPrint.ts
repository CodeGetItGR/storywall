'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { printListKeys, useAddHostPrintItems, useHostPrintList, usePatchPrintItem, usePrintPicksContext, useRemovePrintItem } from '@/hooks/usePrintLists';
import type { MediaResponseDto, PrintItemPatch, PrintListItemDto } from '@/lib/api/types';
import { isPrintable, pickedMediaIds, printableIds, printTotals } from '@/lib/printPicks';

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
    const t = useTranslations('GalleryPage.print');
    const toErrorMessage = useApiErrorMessage();
    const [chosenVendorId, setChosenVendorId] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // The first photographer unless the caller switched; a photographer who left falls back to the first.
    const photographer = photographers.find((p) => p.vendorId === chosenVendorId) ?? photographers[0] ?? null;
    const vendorId = photographer?.vendorId ?? null;
    const listKey = printListKeys.host(eventId, vendorId ?? '');
    const list = useHostPrintList(eventId, vendorId, available && isHost);
    const addItems = useAddHostPrintItems(eventId);
    const patchItem = usePatchPrintItem(eventId, listKey);
    const removeItem = useRemovePrintItem(eventId, listKey);

    const items = useMemo(() => list.data?.items ?? [], [list.data?.items]);
    const pickedIds = useMemo(() => pickedMediaIds(items), [items]);
    const totals = useMemo(() => printTotals(items, isHost ? (photographer?.hostPrintsIncluded ?? 0) : null), [items, isHost, photographer?.hostPrintsIncluded]);
    const viewerItem: PrintListItemDto | undefined = viewerMedia ? items.find((item) => item.mediaId === viewerMedia.id && !item.removed) : undefined;

    const add = useCallback(
        async (mediaIds: string[], skipped: number) => {
            if (!vendorId) return;
            setError(null);
            setNotice(null);
            try {
                if (mediaIds.length) await addItems.mutateAsync({ vendorId, mediaIds });
                setNotice(skipped ? t('skippedNotPrintable') : t('added', { count: mediaIds.length }));
                onAdded();
            } catch (addError) {
                setError(toErrorMessage(addError));
            }
        },
        [addItems, onAdded, t, toErrorMessage, vendorId],
    );

    const addSelected = useCallback(() => {
        const { ids, skipped } = printableIds(media, selectedIds);
        return add(ids, skipped);
    }, [add, media, selectedIds]);

    const toggleViewer = useCallback(async () => {
        if (!viewerMedia) return;
        if (viewerItem) {
            setError(null);
            try {
                await removeItem.mutateAsync(viewerItem.id);
            } catch (removeError) {
                setError(toErrorMessage(removeError));
            }
            return;
        }
        await add([viewerMedia.id], 0);
    }, [add, removeItem, toErrorMessage, viewerItem, viewerMedia]);

    const updateItem = useCallback(
        async (itemId: string, patch: PrintItemPatch) => {
            setError(null);
            try {
                await patchItem.mutateAsync({ itemId, patch });
            } catch (patchError) {
                setError(toErrorMessage(patchError));
            }
        },
        [patchItem, toErrorMessage],
    );

    const deleteItem = useCallback(
        async (itemId: string) => {
            setError(null);
            try {
                await removeItem.mutateAsync(itemId);
            } catch (removeError) {
                setError(toErrorMessage(removeError));
            }
        },
        [removeItem, toErrorMessage],
    );

    const openSheet = useCallback(() => setSheetOpen(true), []);
    const closeSheet = useCallback(() => setSheetOpen(false), []);

    return {
        available,
        photographers,
        photographer,
        selectPhotographer: setChosenVendorId,
        items,
        pickedIds,
        totals,
        pickCount: totals.prints,
        sheetOpen,
        openSheet,
        closeSheet,
        addSelected,
        isAdding: addItems.isPending,
        // The viewer toggle: only on photos, while print picks are available.
        viewerToggle: available && viewerMedia && isPrintable(viewerMedia) ? { picked: Boolean(viewerItem), pending: addItems.isPending || removeItem.isPending, onToggle: toggleViewer } : null,
        updateItem,
        deleteItem,
        notice,
        error,
    };
}
