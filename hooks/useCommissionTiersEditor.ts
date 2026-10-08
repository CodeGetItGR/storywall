'use client';

import { type ChangeEvent, type MouseEvent, useCallback, useMemo, useRef, useState } from 'react';

import { useSaveCollaboratorCommissionTiers } from '@/hooks/useAdmin';
import {
    type CommissionTierDraft,
    commissionTierDrafts,
    commissionTiersError,
    commissionTiersFromDrafts,
    MAX_COMMISSION_TIERS,
    nextCommissionTierDraft,
} from '@/lib/adminCollaborations';
import type { CollaboratorResponseDto } from '@/lib/api/types';

type DraftField = 'minActivations' | 'commissionPercent';

export function useCommissionTiersEditor(collaborator: CollaboratorResponseDto, onCloseAction: () => void) {
    const save = useSaveCollaboratorCommissionTiers();
    const [drafts, setDrafts] = useState<CommissionTierDraft[]>(() => commissionTierDrafts(collaborator.commissionTiers));
    // Rule errors show only after a save attempt, not while the admin is still typing.
    const [attempted, setAttempted] = useState(false);
    const nextKey = useRef(drafts.length);

    const tiers = useMemo(() => commissionTiersFromDrafts(drafts), [drafts]);
    const ruleError = useMemo(() => commissionTiersError(tiers), [tiers]);

    const handleAdd = useCallback(() => {
        setDrafts((current) => [...current, nextCommissionTierDraft(current, `tier-${nextKey.current++}`)]);
    }, []);

    const handleRemove = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const key = event.currentTarget.dataset.tierKey;
        setDrafts((current) => current.filter((draft) => draft.key !== key));
    }, []);

    const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const { value, dataset } = event.currentTarget;
        const field = dataset.field as DraftField;
        setDrafts((current) => current.map((draft) => (draft.key === dataset.tierKey ? { ...draft, [field]: value } : draft)));
    }, []);

    const handleSubmit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            setAttempted(true);
            if (ruleError) return;
            try {
                await save.mutateAsync({ id: collaborator.id, input: { tiers } });
                onCloseAction();
            } catch {
                // Shown in the form through saveError.
            }
        },
        [collaborator.id, onCloseAction, ruleError, save, tiers],
    );

    const handleClose = useCallback(() => {
        save.reset();
        onCloseAction();
    }, [onCloseAction, save]);

    return {
        drafts,
        canAdd: drafts.length < MAX_COMMISSION_TIERS,
        ruleError: attempted ? ruleError : null,
        handleAdd,
        handleRemove,
        handleChange,
        handleSubmit,
        handleClose,
        isSaving: save.isPending,
        saveError: save.error,
    };
}
