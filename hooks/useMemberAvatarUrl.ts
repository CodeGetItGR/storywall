'use client';

import { useCallback } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useActiveMember } from '@/providers/EventProvider';

export function useMemberAvatarUrl() {
    const { user } = useAuth();
    const activeMember = useActiveMember();

    return useCallback(
        (memberId: string | null | undefined, avatarUrl: string | null | undefined) => {
            if (memberId && memberId === activeMember?.id) return user?.profilePictureUrl ?? avatarUrl ?? null;
            return avatarUrl ?? null;
        },
        [activeMember?.id, user?.profilePictureUrl]
    );
}
