'use client';

import { useCallback } from 'react';

import { useCheckCollaboratorVies } from '@/hooks/useAdmin';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export function useCollaboratorViesCheck(collaborator: CollaboratorResponseDto) {
    const check = useCheckCollaboratorVies();
    const { mutate, reset } = check;

    const recheck = useCallback(() => {
        reset();
        mutate(collaborator.id);
    }, [collaborator.id, mutate, reset]);

    return {
        // Without a VAT number there is nothing to ask VIES about (the backend answers 409).
        canRecheck: Boolean(collaborator.vatNumber),
        recheck,
        isChecking: check.isPending,
        checkError: check.error,
    };
}
