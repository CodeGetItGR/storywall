import { MembersPanel } from '@/components/manage/members';
import type { EventInvitationResponseDto, EventMemberResponseDto, EventUsageResponseDto, PlanTierResponseDto } from '@/lib/api/types';

export default function MembersTab({
    canModerate,
    canWrite,
    eventId,
    members,
    invitations,
    eventUsage,
    planTiers,
}: {
    canModerate: boolean;
    canWrite: boolean;
    eventId: string;
    members: EventMemberResponseDto[];
    invitations: EventInvitationResponseDto[];
    eventUsage: EventUsageResponseDto | null;
    planTiers: PlanTierResponseDto[];
}) {
    return (
        <MembersPanel
            canModerate={canModerate}
            canWrite={canWrite}
            eventId={eventId}
            members={members}
            invitations={invitations}
            eventUsage={eventUsage}
            planTiers={planTiers}
        />
    );
}
