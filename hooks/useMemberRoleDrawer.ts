'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { adminMemberRoleKeys, useCreateMemberRole, usePatchMemberRole, useSetMemberRoleRetired } from '@/hooks/useAdminMemberRoles';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { isNotFoundError } from '@/lib/api/errors';
import type { MemberRoleCatalogDto } from '@/lib/api/types';
import { buildCreatePayload, buildPatchPayload, draftFromRole, type MemberRoleDraft, validateRoleDraft } from '@/lib/memberRoles';

export type MemberRoleDrawerError = { kind: 'notFound' } | { kind: 'other'; error: unknown };

// 404 means another admin's change removed the role from under this drawer.
function classifyError(error: unknown): MemberRoleDrawerError {
    if (isNotFoundError(error)) return { kind: 'notFound' };
    return { kind: 'other', error };
}

export function useMemberRoleDrawer({
    role,
    eventTypeKey,
    sortOrder,
    onDoneAction,
}: {
    role: MemberRoleCatalogDto | null;
    eventTypeKey: string;
    sortOrder: number;
    onDoneAction: () => void;
}) {
    const t = useTranslations('AdminPage.memberRoles.drawer');
    const apiErrorMessage = useApiErrorMessage();
    const queryClient = useQueryClient();
    const create = useCreateMemberRole();
    const patch = usePatchMemberRole();
    const retire = useSetMemberRoleRetired();

    const [draft, setDraft] = useState<MemberRoleDraft>(() => draftFromRole(role));
    const [submitted, setSubmitted] = useState(false);
    const [confirmingRetire, setConfirmingRetire] = useState(false);
    const [failure, setFailure] = useState<MemberRoleDrawerError | null>(null);

    const errors = useMemo(() => validateRoleDraft(draft), [draft]);
    const shownErrors = submitted ? errors : {};
    // Shown in the footer next to Save, so it stays in view however far the form is scrolled.
    const failureMessage = failure?.kind === 'notFound' ? t('notFound') : failure?.kind === 'other' ? apiErrorMessage(failure.error) : null;

    const fail = useCallback(
        (error: unknown) => {
            const classified = classifyError(error);
            if (classified.kind === 'notFound') void queryClient.invalidateQueries({ queryKey: adminMemberRoleKeys.all });
            setFailure(classified);
        },
        [queryClient],
    );

    const handleFieldChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.currentTarget;
        setDraft((current) => ({ ...current, [name]: value }));
    }, []);
    const handleLimitModeChange = useCallback(
        (limited: boolean) => setDraft((current) => ({ ...current, limited, maxHolders: limited ? current.maxHolders || '1' : '' })),
        [],
    );
    const handleLimitValueChange = useCallback((maxHolders: string) => setDraft((current) => ({ ...current, maxHolders })), []);
    const handleHostOnlyChange = useCallback((hostOnly: boolean) => setDraft((current) => ({ ...current, hostOnly })), []);

    const handleSubmit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitted(true);
            setFailure(null);
            if (Object.keys(errors).length > 0) return;
            try {
                if (role === null) {
                    await create.mutateAsync(buildCreatePayload(draft, eventTypeKey, sortOrder));
                } else {
                    const input = buildPatchPayload(role, draft);
                    if (Object.keys(input).length > 0) await patch.mutateAsync({ id: role.id, input });
                }
                onDoneAction();
            } catch (error) {
                fail(error);
            }
        },
        [create, draft, errors, eventTypeKey, fail, onDoneAction, patch, role, sortOrder],
    );

    const requestRetire = useCallback(() => setConfirmingRetire(true), []);
    const cancelRetire = useCallback(() => setConfirmingRetire(false), []);
    const setRetired = useCallback(
        async (retired: boolean) => {
            if (!role) return;
            setFailure(null);
            try {
                await retire.mutateAsync({ id: role.id, retired });
                setConfirmingRetire(false);
                onDoneAction();
            } catch (error) {
                setConfirmingRetire(false);
                fail(error);
            }
        },
        [fail, onDoneAction, retire, role],
    );
    const confirmRetire = useCallback(() => setRetired(true), [setRetired]);
    const restore = useCallback(() => setRetired(false), [setRetired]);

    return {
        draft,
        errors: shownErrors,
        failure,
        failureMessage,
        confirmingRetire,
        isSaving: create.isPending || patch.isPending,
        isRetiring: retire.isPending,
        handleFieldChange,
        handleLimitModeChange,
        handleLimitValueChange,
        handleHostOnlyChange,
        handleSubmit,
        requestRetire,
        cancelRetire,
        confirmRetire,
        restore,
    };
}
