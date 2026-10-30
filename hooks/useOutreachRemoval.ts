'use client';

import { useCallback, useState } from 'react';

import { useDeleteOutreachProspect } from '@/hooks/useAdminOutreach';

// Remove takes two clicks: the first arms it, the second deletes.
export function useOutreachRemoval(prospectId: string, onRemoved: () => void) {
    const remove = useDeleteOutreachProspect();
    const [armed, setArmed] = useState(false);

    const arm = useCallback(() => setArmed(true), []);
    const disarm = useCallback(() => setArmed(false), []);
    const confirm = useCallback(() => remove.mutate(prospectId, { onSuccess: onRemoved }), [onRemoved, prospectId, remove]);

    return { armed, arm, disarm, confirm, isRemoving: remove.isPending, error: remove.error };
}
