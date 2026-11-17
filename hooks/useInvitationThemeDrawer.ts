'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, type SubmitEvent, useCallback, useMemo, useRef, useState } from 'react';

import { useUpdateInvitationTheme } from '@/hooks/useAdminInvitationThemes';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { EventTypeOption } from '@/hooks/useInvitationThemesCatalog';
import {
    type AdminInvitationThemeDto,
    followNameSlug,
    hasThemeDetailErrors,
    INVITATION_THEME_STATUSES,
    type InvitationThemeDetails,
    type InvitationThemeSaveFailure,
    type InvitationThemeStatus,
    themeDetails,
    themeDetailsChanged,
    themeSaveFailure,
    themeUpdateRequest,
    validateThemeDetails,
} from '@/lib/adminInvitationThemes';

type DetailField = Exclude<keyof InvitationThemeDetails, 'status'>;

// The drawer's form for one loaded theme. The drawer stays open after a save, so the
// saved theme can be duplicated or previewed next.
export function useInvitationThemeDrawer(theme: AdminInvitationThemeDto, eventTypes: EventTypeOption[]) {
    const t = useTranslations('AdminPage.invitationThemes');
    const apiErrorMessage = useApiErrorMessage();
    const update = useUpdateInvitationTheme();
    // The theme as this drawer loaded it. A refetch behind the drawer never replaces it, so a
    // save still sends the revision the admin started from and a change made elsewhere is refused.
    const [saved, setSaved] = useState(theme);
    const [details, setDetails] = useState<InvitationThemeDetails>(() => themeDetails(theme));
    const [failure, setFailure] = useState<InvitationThemeSaveFailure | null>(null);
    // Set synchronously: a fast double click submits twice before isPending re-renders.
    const submitting = useRef(false);

    const errors = useMemo(() => validateThemeDetails(details), [details]);
    const isDirty = useMemo(() => themeDetailsChanged(details, saved), [details, saved]);

    const handleFieldChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const name = event.currentTarget.name as DetailField;
        const { value } = event.currentTarget;
        setFailure(null);
        setDetails((current) =>
            name === 'name' ? { ...current, name: value, slug: followNameSlug(current, value) } : { ...current, [name]: value },
        );
    }, []);

    const handleStatusChange = useCallback((status: InvitationThemeStatus) => {
        setFailure(null);
        setDetails((current) => ({ ...current, status }));
    }, []);

    const handleSubmit = useCallback(
        (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (submitting.current || hasThemeDetailErrors(errors) || !isDirty) return;
            submitting.current = true;
            setFailure(null);
            update.mutate(
                { id: saved.id, input: themeUpdateRequest(saved, details) },
                {
                    onSuccess: (next) => {
                        setSaved(next);
                        setDetails(themeDetails(next));
                    },
                    onError: (error) => setFailure(themeSaveFailure(error)),
                    onSettled: () => {
                        submitting.current = false;
                    },
                },
            );
        },
        [details, errors, isDirty, saved, update],
    );

    // An untouched theme shows no errors: there is nothing to save yet.
    const shownErrors = isDirty ? errors : {};
    const statusOptions = useMemo(() => INVITATION_THEME_STATUSES.map((value) => ({ value, label: t(`status.${value}`) })), [t]);
    // A theme imported for a type outside the list keeps its own.
    const eventTypeOptions = eventTypes.some((option) => option.key === details.eventType)
        ? eventTypes
        : [...eventTypes, { key: details.eventType, label: details.eventType }];
    const slugHint = failure?.kind === 'slugTaken' ? t('drawer.slugTaken') : shownErrors.slug ? t('drawer.slugInvalid') : undefined;
    const failureMessage = failure?.kind === 'stale' ? t('drawer.stale') : failure?.kind === 'other' ? apiErrorMessage(failure.error) : null;

    return {
        saved,
        details,
        errors: shownErrors,
        statusOptions,
        statusHint: t(`statusHint.${details.status}`),
        eventTypeOptions,
        slugHint,
        failureMessage,
        isDirty,
        isSaving: update.isPending,
        // A copy is made from the saved theme, so unsaved changes block it.
        duplicateBlocked: isDirty || update.isPending,
        handleFieldChange,
        handleStatusChange,
        handleSubmit,
    };
}
