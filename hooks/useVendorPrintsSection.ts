'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
    const [includedOpen, setIncludedOpen] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const self = context.data?.photographers.find((p) => p.vendorId === vendorId) ?? null;
    const included = self?.hostPrintsIncluded ?? 0;
    const items = useMemo(() => hostList.data?.items ?? [], [hostList.data?.items]);
    const totals = useMemo(() => printTotals(items, included), [items, included]);

    // Nothing to download from an empty list, so its parts are not asked for.
    const manifest = usePrintListManifest(open && totals.prints > 0 ? eventId : null, listId);
    const download = useDownloadPrintListPart(eventId);

    // The parts depend on the list: a pick added past a part boundary must not be left out of the download.
    // The first load of a list already reads fresh parts; only a later change to the same list refreshes them.
    const listUpdatedAt = hostList.dataUpdatedAt;
    const seen = useRef<{ listId: string | null; updatedAt: number }>({ listId: null, updatedAt: 0 });
    useEffect(() => {
        if (!listId) return;
        const previous = seen.current;
        seen.current = { listId, updatedAt: listUpdatedAt };
        if (previous.listId === listId && previous.updatedAt !== listUpdatedAt) {
            void queryClient.invalidateQueries({ queryKey: printListKeys.archive(eventId, listId), exact: true });
        }
    }, [queryClient, eventId, listId, listUpdatedAt]);

    const saveIncluded = useCallback(
        async (count: number) => {
            setSaveError(null);
            try {
                await setIncluded.mutateAsync(count);
                setIncludedOpen(false);
            } catch (error) {
                setSaveError(toErrorMessage(error));
            }
        },
        [setIncluded, toErrorMessage],
    );

    const openIncluded = useCallback(() => {
        setSaveError(null);
        setIncludedOpen(true);
    }, []);
    const closeIncluded = useCallback(() => setIncludedOpen(false), []);

    const downloadHostPart = useCallback(
        async (part: number) => {
            if (!listId) return;
            setDownloadError(null);
            try {
                await download.mutateAsync({ listId, part, fileStem: 'prints-host' });
            } catch (error) {
                setDownloadError(toErrorMessage(error));
            }
        },
        [download, listId, toErrorMessage],
    );

    // A failed read must not look like "nothing yet" or "0 included".
    const loadError = hostList.error ?? context.error;
    const sectionError = includedOpen
        ? null
        : (downloadError ?? (loadError ? toErrorMessage(loadError) : null) ?? (manifest.error ? toErrorMessage(manifest.error) : null));

    return {
        open,
        isLoading: hostList.isLoading,
        isLoadingIncluded: context.isLoading,
        loadFailed: Boolean(loadError),
        included,
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
        // The section shows download, load and manifest errors; the sheet shows only its own save error.
        sectionError,
        sheetError: saveError,
    };
}
