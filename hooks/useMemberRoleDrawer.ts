'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { adminMemberRoleKeys, useCreateMemberRole, usePatchMemberRole, useSetMemberRoleRetired } from '@/hooks/useAdminMemberRoles';
import { ApiError } from '@/lib/api/client';
import { isNotFoundError } from '@/lib/api/errors';
import type { MemberRoleCatalogDto } from '@/lib/api/types';
import {
    buildCreatePayload,
    buildPatchPayload,
    draftFromRole,
    type MemberRoleDraft,
    normalizeRoleKeyInput,
    validateRoleDraft,
} from '@/lib/memberRoles';

export type MemberRoleDrawerError = { kind: 'keyTaken' } | { kind: 'notFound' } | { kind: 'other'; error: unknown };

// 409 on create is a duplicate key (shown on the key field); 404 means another
// admin's change removed the role from under this drawer.
function classifyError(error: unknown, isCreate: boolean): MemberRoleDrawerError {
    if (isCreate && error instanceof ApiError && error.status === 409) return { kind: 'keyTaken' };
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
    const isCreate = role === null;
    const queryClient = useQueryClient();
    const create = useCreateMemberRole();
    const patch = usePatchMemberRole();
    const retire = useSetMemberRoleRetired();

    const [draft, setDraft] = useState<MemberRoleDraft>(() => draftFromRole(role));
    const [submitted, setSubmitted] = useState(false);
    const [confirmingRetire, setConfirmingRetire] = useState(false);
    const [failure, setFailure] = useState<MemberRoleDrawerError | null>(null);

    const errors = useMemo(() => validateRoleDraft(draft, isCreate), [draft, isCreate]);
    const shownErrors = submitted ? errors : {};

    const fail = useCallback(
        (error: unknown) => {
            const classified = classifyError(error, isCreate);
            if (classified.kind === 'notFound') void queryClient.invalidateQueries({ queryKey: adminMemberRoleKeys.all });
            setFailure(classified);
        },
        [isCreate, queryClient],
    );

    const handleFieldChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.currentTarget;
        setDraft((current) => ({ ...current, [name]: name === 'roleKey' ? normalizeRoleKeyInput(value) : value }));
    }, []);
    const handleLimitModeChange = useCallback(
        (limited: boolean) => setDraft((current) => ({ ...current, limited, maxHolders: limited ? current.maxHolders || '1' : '' })),
        [],
    );
    const handleLimitValueChange = useCallback((maxHolders: string) => setDraft((current) => ({ ...current, maxHolders })), []);

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
        isCreate,
        draft,
        errors: shownErrors,
        failure,
        confirmingRetire,
        isSaving: create.isPending || patch.isPending,
        isRetiring: retire.isPending,
        handleFieldChange,
        handleLimitModeChange,
        handleLimitValueChange,
        handleSubmit,
        requestRetire,
        cancelRetire,
        confirmRetire,
        restore,
    };
}
