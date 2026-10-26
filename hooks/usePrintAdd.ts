'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAddHostPrintItems } from '@/hooks/usePrintLists';
import { useScopedMessage } from '@/hooks/useScopedMessage';
import type { MediaResponseDto } from '@/lib/api/types';
import { printableIds } from '@/lib/printPicks';

// How long the "added" notice stays on screen.
export const PRINT_NOTICE_MS = 4000;

type PrintAddInput = {
    eventId: string;
    vendorId: string | null;
    media: MediaResponseDto[];
    selectedIds: Set<string>;
    pickedIds: Set<string>;
    // Named in the notice when the host has more than one photographer, so it is clear whose list grew ('' when unnamed).
    photographerName: string | null;
    onAdded: () => void;
};

// Adding photos to the host list: the notice, the error and a guard against a second add while one is running.
export function usePrintAdd({ eventId, vendorId, media, selectedIds, pickedIds, photographerName, onAdded }: PrintAddInput) {
    const t = useTranslations('GalleryPage.print');
    const toErrorMessage = useApiErrorMessage();
    const { mutateAsync: addAsync, isPending: isAdding } = useAddHostPrintItems(eventId);
    const inFlight = useRef(false);
    const scope = `${eventId}|${vendorId ?? ''}`;
    const notice = useScopedMessage(scope, PRINT_NOTICE_MS);
    const error = useScopedMessage(scope);
    const { set: setNotice } = notice;
    const { set: setError } = error;

    // A new selection ends the notice for good, so it does not come back when the selection is cleared.
    const [seenSelection, setSeenSelection] = useState<Set<string> | null>(null);
    if (selectedIds.size > 0 && seenSelection !== selectedIds) {
        setSeenSelection(selectedIds);
        if (notice.text) setNotice(null);
    } else if (selectedIds.size === 0 && seenSelection !== null) {
        setSeenSelection(null);
    }

    // Returns the error message, or null when the add worked or was ignored.
    const add = useCallback(
        async (mediaIds: string[], skipped: number): Promise<string | null> => {
            if (!vendorId || inFlight.current) return null;
            inFlight.current = true;
            setError(null);
            setNotice(null);
            try {
                let added = 0;
                if (mediaIds.length) {
                    const wanted = new Set(mediaIds);
                    const list = await addAsync({ vendorId, mediaIds });
                    // Only photos that were not picked before count as added.
                    added = list.items.filter((item) => !item.removed && wanted.has(item.mediaId) && !pickedIds.has(item.mediaId)).length;
                }
                if (skipped) setNotice(t('skippedNotPrintable'));
                else if (mediaIds.length && !added) setNotice(t('alreadyPicked'));
                else if (mediaIds.length)
                    setNotice(
                        photographerName === null
                            ? t('added', { count: added })
                            : t('addedFor', { count: added, name: photographerName || t('photographerUnnamed') }),
                    );
                onAdded();
                return null;
            } catch (addError) {
                return toErrorMessage(addError);
            } finally {
                inFlight.current = false;
            }
        },
        [addAsync, onAdded, photographerName, pickedIds, setError, setNotice, t, toErrorMessage, vendorId],
    );

    const addSelected = useCallback(async () => {
        const { ids, skipped } = printableIds(media, selectedIds);
        const message = await add(ids, skipped);
        if (message) setError(message);
    }, [add, media, selectedIds, setError]);

    return {
        add,
        addSelected,
        isAdding,
        notice: notice.text,
        error: error.text,
        setError,
    };
}
