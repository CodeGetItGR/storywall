import { MembersPanel } from '@/components/manage/members';
import type { EventInvitationResponseDto, EventMemberResponseDto, EventModuleResponseDto, EventUsageResponseDto, PlanTierResponseDto } from '@/lib/api/types';

export default function MembersTab({
    canModerate,
    canWrite,
    eventId,
    members,
    invitations,
    eventUsage,
    planTiers,
    eventModules,
}: {
    canModerate: boolean;
    canWrite: boolean;
    eventId: string;
    members: EventMemberResponseDto[];
    invitations: EventInvitationResponseDto[];
    eventUsage: EventUsageResponseDto | null;
    planTiers: PlanTierResponseDto[];
    eventModules: EventModuleResponseDto[];
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
            eventModules={eventModules}
        />
    );
}
