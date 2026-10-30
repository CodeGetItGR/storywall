'use client';

import { type ChangeEvent, type SubmitEvent, useCallback, useMemo, useState } from 'react';

import { useCreateOutreachProspect } from '@/hooks/useAdminOutreach';
import { duplicateProspectId, EMPTY_PROSPECT_DRAFT, type ProspectDraft, prospectDraftErrors, toProspectCreateRequest } from '@/lib/adminOutreach';
import type { OutreachPriority } from '@/lib/api/types';

// The Add business form. Errors show after the first submit; a duplicate offers the existing business.
export function useOutreachAddForm(onCreated: (id: string) => void, onOpenExisting: (id: string) => void) {
    const create = useCreateOutreachProspect();
    const [draft, setDraft] = useState<ProspectDraft>(EMPTY_PROSPECT_DRAFT);
    const [submitted, setSubmitted] = useState(false);
    const errors = useMemo(() => (submitted ? prospectDraftErrors(draft) : {}), [draft, submitted]);
    const duplicateId = duplicateProspectId(create.error);

    const handleChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const field = event.currentTarget.name as keyof ProspectDraft;
        const value = event.currentTarget.value;
        setDraft((current) => ({ ...current, [field]: value }));
    }, []);

    const handlePriorityChange = useCallback((priority: OutreachPriority) => setDraft((current) => ({ ...current, priority })), []);

    const handleSubmit = useCallback(
        (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitted(true);
            if (Object.keys(prospectDraftErrors(draft)).length > 0) return;
            create.mutate(toProspectCreateRequest(draft), { onSuccess: (created) => onCreated(created.id) });
        },
        [create, draft, onCreated],
    );

    const handleOpenExistingClick = useCallback(() => {
        if (duplicateId) onOpenExisting(duplicateId);
    }, [duplicateId, onOpenExisting]);

    return {
        draft,
        errors,
        isSaving: create.isPending,
        // undefined: not a duplicate. null: a duplicate the server didn't name.
        duplicateId,
        error: duplicateId === undefined ? create.error : null,
        handleChange,
        handlePriorityChange,
        handleSubmit,
        handleOpenExistingClick,
    };
}

export type OutreachAddFormState = ReturnType<typeof useOutreachAddForm>;
