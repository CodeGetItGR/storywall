'use client';

import { useCallback, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useClearMemberRole, useSetMemberRole } from '@/hooks/useMemberRoleMutations';
import { useMemberRoleOptions } from '@/hooks/useMemberRoleOptions';
import type { EventMemberResponseDto } from '@/lib/api/types';
import {
    buildRoleRequest,
    canSaveDraft,
    DEFAULT_CUSTOM_ROLE_MAX,
    draftFromMember,
    memberHasRole,
    OTHER_CHOICE,
    roleErrorKind,
    type RolePickerDraft,
} from '@/lib/memberRoles';

// 'self': the member's own sheet (custom text can be locked).
// 'host': a host editing someone (never locked; clearing custom text asks first).
export type RoleFormMode = 'self' | 'host';

export function useRoleForm({
    eventId,
    member,
    mode,
    onDoneAction,
}: {
    eventId: string;
    member: EventMemberResponseDto;
    mode: RoleFormMode;
    onDoneAction: () => void;
}) {
    const options = useMemberRoleOptions(eventId, true);
    const { data: appConfig } = useAppConfig();
    const maxLength = appConfig?.contentLimits.memberCustomRelationshipRoleMaxLength ?? DEFAULT_CUSTOM_ROLE_MAX;
    const setRole = useSetMemberRole(eventId);
    const clearRole = useClearMemberRole(eventId);

    const [draft, setDraft] = useState<RolePickerDraft>(() => draftFromMember(member));
    const [error, setError] = useState<unknown>(null);
    const [lockedByError, setLockedByError] = useState(false);
    const [confirmingClear, setConfirmingClear] = useState(false);

    const customLocked = mode === 'self' && (Boolean(options.data?.customLocked) || lockedByError);
    const blockedByLock = customLocked && draft.choice === OTHER_CHOICE;
    const canSave = canSaveDraft(draft, member, maxLength) && !blockedByLock && !setRole.isPending;
    const chosenOption = options.data?.roles.find((option) => option.roleKey === draft.choice) ?? null;

    const handleFailure = useCallback(
        (failure: unknown) => {
            const kind = roleErrorKind(failure);
            if (kind === 'featured' || kind === 'moduleOff') {
                onDoneAction();
                return;
            }
            if (kind === 'locked') setLockedByError(true);
            setError(failure);
        },
        [onDoneAction],
    );

    const handleChoiceChange = useCallback((choice: string) => {
        setError(null);
        setDraft((current) => ({ ...current, choice }));
    }, []);

    const handleCustomTextChange = useCallback((customText: string) => {
        setError(null);
        setDraft((current) => ({ ...current, customText }));
    }, []);

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const request = buildRoleRequest(draft);
        if (!request || !canSave) return;
        setError(null);
        setRole.mutate({ memberId: member.id, request }, { onSuccess: onDoneAction, onError: handleFailure });
    }

    function confirmClear() {
        setError(null);
        clearRole.mutate(member.id, {
            onSuccess: () => {
                setConfirmingClear(false);
                onDoneAction();
            },
            onError: (failure) => {
                setConfirmingClear(false);
                handleFailure(failure);
            },
        });
    }

    function requestClear() {
        if (mode === 'host' && member.customRelationshipRole) {
            setConfirmingClear(true);
            return;
        }
        confirmClear();
    }

    function cancelClear() {
        setConfirmingClear(false);
    }

    return {
        isLoading: options.isLoading,
        loadFailed: Boolean(options.error),
        options: options.data?.roles ?? null,
        allowCustom: Boolean(options.data?.allowCustom),
        customLocked,
        currentRoleKey: member.relationshipRole,
        draft,
        maxLength,
        chosenOption,
        error,
        canSave,
        isSaving: setRole.isPending,
        hasRole: memberHasRole(member),
        isClearing: clearRole.isPending,
        confirmingClear,
        handleChoiceChange,
        handleCustomTextChange,
        handleSubmit,
        requestClear,
        confirmClear,
        cancelClear,
    };
}

export type RoleForm = ReturnType<typeof useRoleForm>;
