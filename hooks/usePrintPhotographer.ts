'use client';

import { useMemo, useState } from 'react';

import { printListKeys } from '@/hooks/usePrintLists';
import type { PrintPhotographerDto } from '@/lib/api/types';

// Whose list the gallery shows: the first photographer unless the caller switched.
// A photographer who left falls back to the first.
export function usePrintPhotographer(eventId: string, photographers: PrintPhotographerDto[]) {
    const [chosenVendorId, setChosenVendorId] = useState<string | null>(null);
    const photographer = photographers.find((p) => p.vendorId === chosenVendorId) ?? photographers[0] ?? null;
    const vendorId = photographer?.vendorId ?? null;
    const listKey = useMemo(() => printListKeys.host(eventId, vendorId ?? ''), [eventId, vendorId]);

    return { photographer, vendorId, listKey, selectPhotographer: setChosenVendorId };
}
