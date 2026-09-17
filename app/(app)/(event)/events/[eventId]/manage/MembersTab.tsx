import { MembersPanel } from '@/components/manage/members';
import type {
    EventHostResponseDto,
    EventInvitationResponseDto,
    EventMemberResponseDto,
    EventModuleResponseDto,
    EventUsageResponseDto,
    PlanTierResponseDto,
} from '@/lib/api/types';

export default function MembersTab({
    canModerate,
    isPrimaryHost,
    canWrite,
    eventId,
    members,
    invitations,
    eventUsage,
    planTiers,
    eventModules,
    hosts,
}: {
    canModerate: boolean;
    isPrimaryHost: boolean;
    canWrite: boolean;
    eventId: string;
    members: EventMemberResponseDto[];
    invitations: EventInvitationResponseDto[];
    eventUsage: EventUsageResponseDto | null;
    planTiers: PlanTierResponseDto[];
    eventModules: EventModuleResponseDto[];
    hosts: EventHostResponseDto[];
}) {
    return (
        <MembersPanel
            canModerate={canModerate}
            isPrimaryHost={isPrimaryHost}
            canWrite={canWrite}
            eventId={eventId}
            members={members}
            invitations={invitations}
            eventUsage={eventUsage}
            planTiers={planTiers}
            eventModules={eventModules}
            hosts={hosts}
        />
    );
}
