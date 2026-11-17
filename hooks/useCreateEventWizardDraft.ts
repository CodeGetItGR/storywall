'use client';

import { useCallback, useRef, useState } from 'react';

import {
    clearCreateEventWizardDraft,
    type CreateEventWizardDraft,
    readCreateEventWizardDraft,
    writeCreateEventWizardDraft,
} from '@/lib/createEventWizardDraft';
import { eventTypeSlug } from '@/lib/eventTypeSlug';

/**
 * The wizard's saved answers: read once when the form mounts, written as the host types, cleared
 * when checkout opens. A link to another event type starts fresh: those answers belong to a
 * different event, as when the host changes the type by hand.
 */
export function useCreateEventWizardDraft(enabled: boolean, linkTypeSlug: string | null) {
    const [initial] = useState(() => {
        if (!enabled) return null;
        const draft = readCreateEventWizardDraft();
        if (!draft) return null;
        if (linkTypeSlug && draft.eventType && eventTypeSlug(draft.eventType) !== linkTypeSlug) return null;
        return draft;
    });
    const cleared = useRef(false);

    const save = useCallback(
        (draft: CreateEventWizardDraft) => {
            if (enabled && !cleared.current) writeCreateEventWizardDraft(draft);
        },
        [enabled],
    );

    // After this, nothing is saved again by this form (checkout is opening).
    const clear = useCallback(() => {
        cleared.current = true;
        clearCreateEventWizardDraft();
    }, []);

    return { initial, save, clear };
}
