'use client';

import { type ChangeEvent, useState } from 'react';

import { useSetInviartCollection } from '@/hooks/useAdminInviartCollections';
import type { InviartCollectionRow } from '@/hooks/useInviartCollectionsPanel';
import { isInviartHandle } from '@/lib/inviartAdmin';

// The drawer's one field: the occasion's collection handle. Saving an empty one clears it.
export function useInviartCollectionForm(row: InviartCollectionRow, onDone: () => void) {
    const mutation = useSetInviartCollection();
    const [handle, setHandle] = useState(row.collectionHandle ?? '');
    const trimmed = handle.trim();
    const valid = trimmed === '' || isInviartHandle(trimmed);
    const changed = trimmed !== (row.collectionHandle ?? '');

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        setHandle(event.target.value);
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!valid || !changed || mutation.isPending) return;
        mutation.mutate({ eventType: row.eventType, collectionHandle: trimmed }, { onSuccess: onDone });
    }

    return {
        handle,
        valid,
        canSave: valid && changed && !mutation.isPending,
        saving: mutation.isPending,
        error: mutation.error,
        handleChange,
        handleSubmit,
    };
}
