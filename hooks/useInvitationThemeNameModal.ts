'use client';

import { type ChangeEvent, type SubmitEvent, useCallback, useRef, useState } from 'react';

import { useCreateInvitationTheme, useDuplicateInvitationTheme } from '@/hooks/useAdminInvitationThemes';
import type { InvitationThemeNameModalState } from '@/hooks/useInvitationThemesCatalog';
import {
    type AdminInvitationThemeDto,
    type AdminInvitationThemeSummaryDto,
    INVITATION_THEME_EVENT_TYPES,
    type InvitationThemeSaveFailure,
    isValidThemeName,
    nextThemeSortOrder,
    themeCreateRequest,
    themeDuplicateRequest,
    themeSaveFailure,
} from '@/lib/adminInvitationThemes';

// The new theme and duplicate modal: a name (and, for a new theme, its event type). The slug
// comes from the name, made unique against every theme in the list.
export function useInvitationThemeNameModal({
    state,
    themes,
    onNamedAction,
}: {
    state: NonNullable<InvitationThemeNameModalState>;
    themes: AdminInvitationThemeSummaryDto[];
    onNamedAction: (theme: AdminInvitationThemeDto) => void;
}) {
    const create = useCreateInvitationTheme();
    const duplicate = useDuplicateInvitationTheme();
    const [name, setName] = useState(state.mode === 'duplicate' ? state.sourceName : '');
    const [eventType, setEventType] = useState<string>(INVITATION_THEME_EVENT_TYPES[0]);
    const [submitted, setSubmitted] = useState(false);
    const [failure, setFailure] = useState<InvitationThemeSaveFailure | null>(null);
    // Set synchronously: a fast double click would otherwise make two themes.
    const submitting = useRef(false);
    const nameInvalid = submitted && !isValidThemeName(name);

    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setFailure(null);
        setName(event.currentTarget.value);
    }, []);

    const handleEventTypeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        setEventType(event.currentTarget.value);
    }, []);

    const handleSubmit = useCallback(
        (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitted(true);
            if (submitting.current || !isValidThemeName(name)) return;
            submitting.current = true;
            setFailure(null);
            const takenSlugs = themes.map((theme) => theme.slug);
            const callbacks = {
                onSuccess: (theme: AdminInvitationThemeDto) => onNamedAction(theme),
                onError: (error: unknown) => setFailure(themeSaveFailure(error)),
                onSettled: () => {
                    submitting.current = false;
                },
            };
            if (state.mode === 'duplicate') {
                duplicate.mutate({ id: state.sourceId, input: themeDuplicateRequest(name, takenSlugs) }, callbacks);
            } else {
                create.mutate(themeCreateRequest({ name, eventType }, takenSlugs, nextThemeSortOrder(themes, eventType)), callbacks);
            }
        },
        [create, duplicate, eventType, name, onNamedAction, state, themes],
    );

    return {
        name,
        eventType,
        nameInvalid,
        failure,
        isSaving: create.isPending || duplicate.isPending,
        handleNameChange,
        handleEventTypeChange,
        handleSubmit,
    };
}
