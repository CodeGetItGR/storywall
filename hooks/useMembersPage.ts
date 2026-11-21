'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useUpgradeOptions } from '@/hooks/useBilling';
import { useCoHostCapacity } from '@/hooks/useCoHostCapacity';
import { useMemberModeration } from '@/hooks/useMemberModeration';
import { useMemberRoleSheet } from '@/hooks/useMemberRoleSheet';
import { usePromoteCoHost } from '@/hooks/usePromoteCoHost';
import type {
    EventHostResponseDto,
    EventInvitationResponseDto,
    EventMemberResponseDto,
    EventModuleResponseDto,
    EventUsageResponseDto,
    PlanTierResponseDto,
} from '@/lib/api/types';
import { selectPendingCoHostInvitations } from '@/lib/eventInvitations';
import { guestMembers, sortHosts } from '@/lib/eventMembers';
import { canManageMemberRoles } from '@/lib/memberRoles';
import { findPlanByCode } from '@/lib/planTiers';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

export type MembersPanelProps = {
    canModerate: boolean;
    canWrite: boolean;
    eventId: string;
    members: EventMemberResponseDto[];
    invitations: EventInvitationResponseDto[];
    eventUsage: EventUsageResponseDto | null;
    planTiers: PlanTierResponseDto[];
    eventModules: EventModuleResponseDto[];
    hosts: EventHostResponseDto[];
    isPrimaryHost: boolean;
};

export type HostRowData = { host: EventHostResponseDto; member: EventMemberResponseDto | undefined };

export function useMembersPage({
    canModerate,
    canWrite,
    eventId,
    members,
    invitations,
    eventUsage,
    planTiers,
    eventModules,
    hosts,
    isPrimaryHost,
}: MembersPanelProps) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();
    const { data: appConfig } = useAppConfig();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const { data: upgradeOptions = [] } = useUpgradeOptions(eventId, isPrimaryHost);
    const moderation = useMemberModeration(eventId, canModerate);
    const roleSheet = useMemberRoleSheet(members);
    const promoteFlow = usePromoteCoHost(eventId);
    const [inviteOpen, setInviteOpen] = useState(false);

    const coHostsAvailable = eventModules.find((module_) => module_.moduleKey === 'co_hosts')?.isAvailable ?? false;
    const memberLimit = eventUsage?.memberLimit ?? null;
    const memberCount = eventUsage?.memberCount ?? 0;
    const membersFull = memberLimit !== null && memberCount >= memberLimit;
    const currentPlan = eventUsage ? findPlanByCode(planTiers, 'EVENT', eventUsage.planTier) : undefined;
    const nextPlan = upgradeOptions[0] ? findPlanByCode(planTiers, 'EVENT', upgradeOptions[0].planTierCode) : undefined;
    const coHostCapacity = useCoHostCapacity(hosts, currentPlan, nextPlan, activeEvent?.modules);

    // Same wording and rule as today's notice under the bars.
    const membersFullNotice =
        canWrite && membersFull
            ? nextPlan
                ? nextPlan.maxMembers === null
                    ? t('invitations.full.noticeWithUnlimitedUpgrade', { plan: nextPlan.name })
                    : t('invitations.full.noticeWithUpgrade', { plan: nextPlan.name, seats: nextPlan.maxMembers })
                : t('invitations.full.notice')
            : null;

    const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
    const hostRows = useMemo<HostRowData[]>(
        () => sortHosts(hosts).map((host) => ({ host, member: membersById.get(host.memberId) })),
        [hosts, membersById],
    );
    const guests = useMemo(() => guestMembers(members, hosts), [members, hosts]);
    const pendingInvitations = useMemo(() => selectPendingCoHostInvitations(invitations), [invitations]);

    const canInviteCoHost = canWrite && coHostsAvailable && !membersFull && !coHostCapacity.isFull;
    const openInvite = useCallback(() => setInviteOpen(true), []);
    const closeInvite = useCallback(() => setInviteOpen(false), []);

    return {
        eventId,
        locale,
        canWrite,
        canModerate,
        coHostsAvailable,
        // Tiles
        memberUsage: eventUsage ? { used: memberCount, limit: memberLimit, percent: eventUsage.memberPercent } : null,
        coHostUsage: coHostsAvailable ? coHostCapacity : null,
        membersFullNotice,
        coHostsFullNotice: canWrite ? coHostCapacity.fullNotice : null,
        // Current hosts
        hostRows,
        pendingInvitations,
        canManageHosts: isPrimaryHost && canWrite,
        canInviteCoHost,
        inviteOpen,
        openInvite,
        closeInvite,
        // Members
        guests,
        activeMemberId: activeMember?.id ?? null,
        eventTypeKey: activeEvent?.eventType ?? null,
        canManageRoles: canManageMemberRoles(activeEvent, canModerate),
        canReport: canModerate && Boolean(appConfig?.reportTargetTypes?.includes('MEMBER')),
        // Promoting takes no member seat (they are already in), only a co-host one.
        canPromote: canWrite && coHostsAvailable && !coHostCapacity.isFull,
        moderation,
        roleSheet,
        promoteFlow,
    };
}

export type MembersPageState = ReturnType<typeof useMembersPage>;
