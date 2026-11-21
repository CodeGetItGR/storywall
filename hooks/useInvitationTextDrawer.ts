'use client';

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCreateInvitationText, useDeleteInvitationText, usePatchInvitationText } from '@/hooks/useAdminInvitationTexts';
import type { EventTypeOption } from '@/hooks/useInvitationThemesCatalog';
import {
    type AdminInvitationTextDto,
    buildInvitationTextCreate,
    buildInvitationTextPatch,
    draftFromText,
    type InvitationTextDraft,
    type InvitationTextLanguage,
    validateInvitationTextDraft,
} from '@/lib/adminInvitationTexts';

type TextField = 'label' | 'body';

// One text's drawer: the draft, its checks, the save, and the delete behind its confirmation.
export function useInvitationTextDrawer({
    text,
    texts,
    eventTypes,
    onDoneAction,
}: {
    text: AdminInvitationTextDto | null;
    // The whole list, so a new or moved text goes last in its group.
    texts: AdminInvitationTextDto[];
    eventTypes: EventTypeOption[];
    onDoneAction: () => void;
}) {
    const create = useCreateInvitationText();
    const patch = usePatchInvitationText();
    const remove = useDeleteInvitationText();

    const [draft, setDraft] = useState<InvitationTextDraft>(() => draftFromText(text));
    const [submitted, setSubmitted] = useState(false);
    const [failure, setFailure] = useState<unknown>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const submitting = useRef(false);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    // Until the admin picks one, a new text is for the first event type on offer.
    const eventType = draft.eventType || eventTypes[0]?.key || '';
    const errors = useMemo(() => validateInvitationTextDraft(draft, eventType), [draft, eventType]);

    const handleFieldChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const field = event.currentTarget.name as TextField;
        const value = event.currentTarget.value;
        setDraft((current) => ({ ...current, [field]: value }));
    }, []);

    const handleEventTypeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        const value = event.currentTarget.value;
        setDraft((current) => ({ ...current, eventType: value }));
    }, []);

    const handleLanguageChange = useCallback((language: InvitationTextLanguage) => {
        setDraft((current) => ({ ...current, language }));
    }, []);

    const handleSubmit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitted(true);
            setFailure(null);
            if (Object.keys(errors).length > 0 || submitting.current) return;
            submitting.current = true;
            try {
                if (text === null) {
                    await create.mutateAsync(buildInvitationTextCreate(draft, eventType, texts));
                } else {
                    const input = buildInvitationTextPatch(text, draft, eventType, texts);
                    if (Object.keys(input).length > 0) await patch.mutateAsync({ id: text.id, input });
                }
                if (mounted.current) onDoneAction();
            } catch (error) {
                if (mounted.current) setFailure(error);
            } finally {
                submitting.current = false;
            }
        },
        [create, draft, errors, eventType, onDoneAction, patch, text, texts],
    );

    const openDelete = useCallback(() => setConfirmingDelete(true), []);
    const closeDelete = useCallback(() => setConfirmingDelete(false), []);
    const confirmDelete = useCallback(async () => {
        if (text === null || submitting.current) return;
        submitting.current = true;
        setFailure(null);
        try {
            await remove.mutateAsync(text.id);
            if (mounted.current) onDoneAction();
        } catch (error) {
            if (!mounted.current) return;
            setConfirmingDelete(false);
            setFailure(error);
        } finally {
            submitting.current = false;
        }
    }, [onDoneAction, remove, text]);

    return {
        isCreate: text === null,
        draft,
        eventType,
        errors: submitted ? errors : {},
        failure,
        isSaving: create.isPending || patch.isPending,
        isDeleting: remove.isPending,
        confirmingDelete,
        handleFieldChange,
        handleEventTypeChange,
        handleLanguageChange,
        handleSubmit,
        openDelete,
        closeDelete,
        confirmDelete,
    };
}
