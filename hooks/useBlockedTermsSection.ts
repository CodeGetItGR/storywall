'use client';

import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useAddBlockedTerm, useBlockedTerms, useDeleteBlockedTerm } from '@/hooks/useBlockedTerms';
import type { BlockedTermDto } from '@/lib/api/types';
import { blockedTermError, validateBlockedTerm } from '@/lib/blockedTerms';

// The blocked words list, its add modal and its delete confirmation.
export function useBlockedTermsSection() {
    const terms = useBlockedTerms();
    const add = useAddBlockedTerm();
    const remove = useDeleteBlockedTerm();
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [deleting, setDeleting] = useState<BlockedTermDto | null>(null);

    const sorted = useMemo(() => [...(terms.data ?? [])].sort((left, right) => left.term.localeCompare(right.term)), [terms.data]);
    const invalid = submitted && validateBlockedTerm(draft) !== null;
    const addFailure = add.error ? blockedTermError(add.error) : null;

    const openAdd = useCallback(() => {
        add.reset();
        setDraft('');
        setSubmitted(false);
        setAdding(true);
    }, [add]);
    const closeAdd = useCallback(() => setAdding(false), []);
    const handleDraftChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setDraft(event.currentTarget.value), []);

    function handleAddSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitted(true);
        if (validateBlockedTerm(draft) !== null || add.isPending) return;
        add.mutate({ term: draft.trim() }, { onSuccess: () => setAdding(false) });
    }

    const requestDelete = useCallback(
        (id: string) => {
            remove.reset();
            setDeleting(sorted.find((term) => term.id === id) ?? null);
        },
        [remove, sorted],
    );
    const cancelDelete = useCallback(() => setDeleting(null), []);
    function confirmDelete() {
        if (deleting) remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
    }

    return {
        terms: sorted,
        isLoading: terms.isLoading,
        loadError: terms.error,
        adding,
        draft,
        invalid,
        addFailure,
        addError: add.error,
        isAdding: add.isPending,
        openAdd,
        closeAdd,
        handleDraftChange,
        handleAddSubmit,
        deleting,
        deleteError: remove.error,
        isDeleting: remove.isPending,
        requestDelete,
        cancelDelete,
        confirmDelete,
    };
}

export type BlockedTermsSectionState = ReturnType<typeof useBlockedTermsSection>;
