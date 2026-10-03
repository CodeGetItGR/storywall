'use client';

import { useCallback, useState } from 'react';

import type { EventMemberResponseDto } from '@/lib/api/types';

// The member whose role the host is editing. Reads the member from the live
// list so the sheet follows cache patches.
export function useMemberRoleSheet(members: EventMemberResponseDto[]) {
    const [memberId, setMemberId] = useState<string | null>(null);
    const member = memberId ? (members.find((item) => item.id === memberId) ?? null) : null;

    const open = useCallback((target: EventMemberResponseDto) => setMemberId(target.id), []);
    const close = useCallback(() => setMemberId(null), []);

    return { member, open, close };
}
