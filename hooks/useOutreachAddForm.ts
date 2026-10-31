'use client';

import { useLocale } from 'next-intl';
import { type ChangeEvent, type SubmitEvent, useCallback, useMemo, useState } from 'react';

import { useCreateOutreachProspect } from '@/hooks/useAdminOutreach';
import { useCreateOutreachRequest } from '@/hooks/useAdminOutreachRequests';
import { duplicateProspectId, EMPTY_PROSPECT_DRAFT, type ProspectDraft, prospectDraftErrors, toProspectCreateRequest } from '@/lib/adminOutreach';
import type { OutreachPriority } from '@/lib/api/types';

type AddFormErrors = ReturnType<typeof prospectDraftErrors> & { note?: 'required' };

function formErrors(draft: ProspectDraft, note: string, suggest: boolean): AddFormErrors {
    const errors: AddFormErrors = prospectDraftErrors(draft);
    if (suggest && !note.trim()) errors.note = 'required';
    return errors;
}

// The Add business form. Errors show after the first submit; a duplicate offers the existing business.
// `suggest` (marketing): the same form, plus a required note, sends an ADD request for an admin instead.
// The "why" text is sent as written in the UI language (Greek UI: the El fields).
export function useOutreachAddForm(
    onCreated: (id: string) => void,
    onOpenExisting: (id: string) => void,
    suggest = false,
    onSuggested: () => void = () => {},
) {
    const locale = useLocale();
    const createProspect = useCreateOutreachProspect();
    const createRequest = useCreateOutreachRequest();
    const create = suggest ? createRequest : createProspect;
    const [draft, setDraft] = useState<ProspectDraft>(EMPTY_PROSPECT_DRAFT);
    const [note, setNote] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const errors = useMemo(() => (submitted ? formErrors(draft, note, suggest) : {}), [draft, note, submitted, suggest]);
    const duplicateId = duplicateProspectId(create.error);

    const handleChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const field = event.currentTarget.name as keyof ProspectDraft;
        const value = event.currentTarget.value;
        setDraft((current) => ({ ...current, [field]: value }));
    }, []);

    const handlePriorityChange = useCallback((priority: OutreachPriority) => setDraft((current) => ({ ...current, priority })), []);

    const handleNoteChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.currentTarget.value), []);

    const handleSubmit = useCallback(
        (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitted(true);
            if (Object.keys(formErrors(draft, note, suggest)).length > 0) return;
            const proposal = toProspectCreateRequest(draft, locale);
            if (suggest) {
                createRequest.mutate({ kind: 'ADD', proposal, note: note.trim() }, { onSuccess: onSuggested });
            } else {
                createProspect.mutate(proposal, { onSuccess: (created) => onCreated(created.id) });
            }
        },
        [createProspect, createRequest, draft, locale, note, onCreated, onSuggested, suggest],
    );

    const handleOpenExistingClick = useCallback(() => {
        if (duplicateId) onOpenExisting(duplicateId);
    }, [duplicateId, onOpenExisting]);

    return {
        draft,
        note,
        errors,
        isSaving: create.isPending,
        // undefined: not a duplicate. null: a duplicate the server didn't name.
        duplicateId,
        error: duplicateId === undefined ? create.error : null,
        handleChange,
        handlePriorityChange,
        handleNoteChange,
        handleSubmit,
        handleOpenExistingClick,
    };
}

export type OutreachAddFormState = ReturnType<typeof useOutreachAddForm>;
