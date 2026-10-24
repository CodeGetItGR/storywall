'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import {
    printListKeys,
    useDownloadPrintListPart,
    useHostPrintList,
    usePrintListManifest,
    usePrintPicksContext,
    useSetPrintsIncluded,
} from '@/hooks/usePrintLists';
import type { VendorMeDto } from '@/lib/api/types';
import { printTotals } from '@/lib/printPicks';
import { hasVendorCapability } from '@/lib/vendors';

// The photographer's Prints section: the host list, what the package includes, and the download.
export function useVendorPrintsSection(eventId: string, me: VendorMeDto | null) {
    const toErrorMessage = useApiErrorMessage();
    const queryClient = useQueryClient();
    const open = hasVendorCapability(me, 'PRINT_PICKS');
    const context = usePrintPicksContext(open ? eventId : null);
    const vendorId = me?.vendorId ?? null;
    const hostList = useHostPrintList(eventId, vendorId, open);
    const setIncluded = useSetPrintsIncluded(eventId);
    const listId = hostList.data?.id ?? null;
    const manifest = usePrintListManifest(open ? eventId : null, listId);
    const download = useDownloadPrintListPart(eventId);
    const listUpdatedAt = hostList.dataUpdatedAt;
    // The parts depend on the list: a pick added past a part boundary must not be left out of the download.
    useEffect(() => {
        if (listId) void queryClient.invalidateQueries({ queryKey: printListKeys.archive(eventId, listId), exact: true });
    }, [queryClient, eventId, listId, listUpdatedAt]);
    const [includedOpen, setIncludedOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const self = context.data?.photographers.find((p) => p.vendorId === vendorId) ?? null;
    const included = self?.hostPrintsIncluded ?? 0;
    const items = useMemo(() => hostList.data?.items ?? [], [hostList.data?.items]);
    const totals = useMemo(() => printTotals(items, included), [items, included]);

    const saveIncluded = useCallback(
        async (count: number) => {
            setError(null);
            try {
                await setIncluded.mutateAsync(count);
                setIncludedOpen(false);
            } catch (saveError) {
                setError(toErrorMessage(saveError));
            }
        },
        [setIncluded, toErrorMessage],
    );

    const openIncluded = useCallback(() => {
        setError(null);
        setIncludedOpen(true);
    }, []);
    const closeIncluded = useCallback(() => setIncludedOpen(false), []);

    const downloadHostPart = useCallback(
        async (part: number) => {
            if (!listId) return;
            setError(null);
            try {
                await download.mutateAsync({ listId, part, fileStem: 'prints-host' });
            } catch (downloadError) {
                setError(toErrorMessage(downloadError));
            }
        },
        [download, listId, toErrorMessage],
    );

    return {
        open,
        isLoading: hostList.isLoading || context.isLoading,
        included,
        sizes: self?.sizes ?? [],
        items,
        removedCount: hostList.data?.removedCount ?? 0,
        totals,
        // 0 when nothing is ready to download; 1 shows a single Download button, more show one button per part.
        partCount: manifest.data?.parts.length ?? 0,
        isLoadingParts: manifest.isLoading,
        downloadingPart: download.isPending ? (download.variables?.part ?? null) : null,
        downloadHostPart,
        includedOpen,
        openIncluded,
        closeIncluded,
        saveIncluded,
        isSavingIncluded: setIncluded.isPending,
        // A failed manifest shows here too, so the photographer is never left with no button and no message.
        error: error ?? (manifest.error ? toErrorMessage(manifest.error) : null),
    };
}
