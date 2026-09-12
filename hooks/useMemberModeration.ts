import { useMemo, useState } from 'react';

import { useDeleteEventMember } from '@/hooks/useEventMembers';
import type { EventMemberResponseDto } from '@/lib/api/types';

export function useMemberModeration(eventId: string, members: EventMemberResponseDto[], canModerate: boolean) {
    const deleteMember = useDeleteEventMember(eventId);
    const [memberToRemove, setMemberToRemove] = useState<EventMemberResponseDto | null>(null);
    const [memberToReport, setMemberToReport] = useState<EventMemberResponseDto | null>(null);
    const [removeError, setRemoveError] = useState<string | null>(null);

    const attendees = useMemo(() => members.filter((member) => member.role === 'ATTENDEE'), [members]);

    function requestRemove(member: EventMemberResponseDto) {
        if (!canModerate) return;
        setRemoveError(null);
        setMemberToRemove(member);
    }

    function requestReport(member: EventMemberResponseDto) {
        if (!canModerate) return;
        setMemberToReport(member);
    }

    function closeRemove() {
        if (!deleteMember.isPending) setMemberToRemove(null);
    }

    function closeReport() {
        setMemberToReport(null);
    }

    async function confirmRemove(failedMessage: string) {
        if (!memberToRemove || deleteMember.isPending) return;

        setRemoveError(null);
        try {
            await deleteMember.mutateAsync(memberToRemove.id);
            setMemberToRemove(null);
        } catch {
            setRemoveError(failedMessage);
        }
    }

    return {
        attendees,
        closeRemove,
        closeReport,
        confirmRemove,
        isRemoving: deleteMember.isPending,
        memberToRemove,
        memberToReport,
        removeError,
        requestRemove,
        requestReport,
    };
}
