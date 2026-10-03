'use client';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useUnlockMemberRole } from '@/hooks/useMemberRoleMutations';

// Lifts a member's custom-role lock. Hosts can't see the lock state (the API
// doesn't expose it), so the action is always offered and is harmless.
export function useMemberRoleUnlock(memberId: string) {
    const mutation = useUnlockMemberRole();
    const describe = useApiErrorMessage();

    function unlock() {
        mutation.mutate(memberId);
    }

    return {
        unlock,
        isPending: mutation.isPending,
        done: mutation.isSuccess,
        errorMessage: mutation.error ? describe(mutation.error) : null,
    };
}
