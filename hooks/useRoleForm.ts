'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAppConfig, useMemberRoleCatalog } from '@/hooks/useAppConfig';
import { eventKeys } from '@/hooks/useEvent';
import { useClearMemberRole, useSetMemberRole } from '@/hooks/useMemberRoleMutations';
import { useMemberRoleOptions } from '@/hooks/useMemberRoleOptions';
import type { Locale } from '@/i18n/config';
import type { EventMemberResponseDto } from '@/lib/api/types';
import {
    buildRoleRequest,
    canSaveDraft,
    DEFAULT_CUSTOM_ROLE_MAX,
    draftFromMember,
    heldHostOnlyRole,
    hostOnlyRoleKeys,
    memberHasRole,
    optionLabel,
    OTHER_CHOICE,
    roleErrorKind,
    type RolePickerDraft,
} from '@/lib/memberRoles';
import { useActiveEvent } from '@/providers/EventProvider';

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
    const queryClient = useQueryClient();
    const setRole = useSetMemberRole(eventId);
    const clearRole = useClearMemberRole(eventId);
    const catalog = useMemberRoleCatalog();
    const eventTypeKey = useActiveEvent()?.eventType;
    const locale = useLocale() as Locale;

    const [rawDraft, setDraft] = useState<RolePickerDraft>(() => draftFromMember(member));
    const [error, setError] = useState<unknown>(null);
    const [lockedByError, setLockedByError] = useState(false);
    const [confirmingClear, setConfirmingClear] = useState(false);

    // A role retired since the draft was made (after a refetch) no longer counts as chosen.
    const draft: RolePickerDraft =
        options.data && rawDraft.choice !== null && rawDraft.choice !== OTHER_CHOICE && !options.data.roles.some((option) => option.roleKey === rawDraft.choice)
            ? { ...rawDraft, choice: null }
            : rawDraft;

    const moduleOff = roleErrorKind(options.error) === 'moduleOff';
    useEffect(() => {
        if (!moduleOff) return;
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId), exact: true });
        onDoneAction();
    }, [eventId, moduleOff, onDoneAction, queryClient]);

    // A guest holding a host-only role sees it locked and can only clear it (§1.1).
    const lockedRole = heldHostOnlyRole({ roleKey: member.relationshipRole, options: options.data?.roles, catalog, eventTypeKey });
    const hostOnlyKeys = useMemo(() => hostOnlyRoleKeys(catalog, eventTypeKey), [catalog, eventTypeKey]);

    const customLocked = mode === 'self' && (Boolean(options.data?.customLocked) || lockedByError);
    const blockedByLock = customLocked && draft.choice === OTHER_CHOICE;
    const canSave = canSaveDraft(draft, member, maxLength) && !blockedByLock && !lockedRole && !setRole.isPending;
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
        lockedRoleLabel: lockedRole ? optionLabel(lockedRole, locale) : null,
        hostOnlyKeys,
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
