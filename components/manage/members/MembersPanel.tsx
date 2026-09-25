'use client';

import { Plus, UserCog, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { CoHostInvitationRow, CreateCoHostInvitationForm } from '@/components/manage/invitations';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { ReportTargetModal } from '@/components/reports';
import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { type SubTabItem, SubTabs } from '@/components/ui/SubTabs';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useUpgradeOptions } from '@/hooks/useBilling';
import { useMemberModeration } from '@/hooks/useMemberModeration';
import type {
    EventHostResponseDto,
    EventInvitationResponseDto,
    EventMemberResponseDto,
    EventModuleResponseDto,
    EventUsageResponseDto,
    PlanTierResponseDto,
} from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { selectCoHostInvitations } from '@/lib/eventInvitations';
import { findPlanByCode } from '@/lib/planTiers';
import { routes } from '@/lib/routes';

import { CoHostManagementList } from './CoHostManagementList';
import { MemberRow } from './MemberRow';

type MembersSubTab = 'members' | 'coHosts';

type MembersPanelProps = {
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

export function MembersPanel({
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
    const tMembers = useTranslations('ManagePage.members');
    const locale = useLocale();
    const { data: appConfig } = useAppConfig();
    const searchParams = useSearchParams();
    const requestedTab = searchParams.get('section');
    const coHostsAvailable = eventModules.find((module_) => module_.moduleKey === 'co_hosts')?.isAvailable ?? false;
    const [tab, setTab] = useState<MembersSubTab>(requestedTab === 'coHosts' && coHostsAvailable ? 'coHosts' : 'members');
    const [showCreate, setShowCreate] = useState(false);

    const moderation = useMemberModeration(eventId, canModerate);
    const { data: upgradeOptions = [] } = useUpgradeOptions(eventId, isPrimaryHost);
    const handleConfirmRemove = useCallback(() => moderation.confirmRemove(tMembers('removeFailed')), [moderation, tMembers]);
    const canReport = canModerate && Boolean(appConfig?.reportTargetTypes?.includes('MEMBER'));

    const tabs = useMemo<SubTabItem<MembersSubTab>[]>(
        () => [
            { key: 'members', icon: Users, label: tMembers('title') },
            ...(coHostsAvailable ? [{ key: 'coHosts' as const, icon: UserCog, label: t('invitations.panels.coHosts') }] : []),
        ],
        [t, tMembers, coHostsAvailable],
    );

    const memberLimit = eventUsage?.memberLimit ?? null;
    const memberCount = eventUsage?.memberCount ?? 0;
    const isFull = memberLimit !== null && memberCount >= memberLimit;
    const currentPlan = eventUsage ? findPlanByCode(planTiers, 'EVENT', eventUsage.planTier) : undefined;
    const nextUpgradeOption = upgradeOptions[0];
    const nextPlan = nextUpgradeOption ? findPlanByCode(planTiers, 'EVENT', nextUpgradeOption.planTierCode) : undefined;
    const upgradeHref = routes.events.manage(eventId, { tab: 'billing' });

    const canCreate = canWrite && !isFull;

    const handleTabSelect = useCallback((next: MembersSubTab) => {
        setTab(next);
        setShowCreate(false);
    }, []);

    const handleShowCreate = useCallback(() => {
        if (!canCreate) return;
        setShowCreate(true);
    }, [canCreate]);

    const handleHideCreate = useCallback(() => {
        setShowCreate(false);
    }, []);

    const showCoHosts = tab === 'coHosts';
    const coHostInvitations = useMemo(() => selectCoHostInvitations(invitations), [invitations]);

    return (
        <div className="flex flex-col">
            {/* Panels */}
            {tabs.length > 1 && <SubTabs tabs={tabs} active={tab} onSelectAction={handleTabSelect} className="mb-4" />}

            {/* Capacity */}
            {showCoHosts && eventUsage && (
                <div className="mb-4">
                    <UsagePanel
                        title={t('invitations.capacity.title')}
                        planName={currentPlan?.name ?? eventUsage.planTier}
                        nextPlanName={isFull ? nextUpgradeOption?.planTierName : undefined}
                        upgradeHref={upgradeHref}
                        items={[
                            {
                                key: 'members',
                                used: memberCount,
                                limit: memberLimit,
                                percent: eventUsage.memberPercent,
                                valueLabel: memberLimit === null ? `${memberCount}` : `${memberCount} / ${memberLimit}`,
                            },
                        ]}
                    />
                    {canWrite && isFull && (
                        <p className="mt-2 text-xs leading-relaxed text-amber-700">
                            {nextPlan
                                ? nextPlan.maxMembers === null
                                    ? t('invitations.full.noticeWithUnlimitedUpgrade', { plan: nextPlan.name })
                                    : t('invitations.full.noticeWithUpgrade', { plan: nextPlan.name, seats: nextPlan.maxMembers })
                                : t('invitations.full.notice')}
                        </p>
                    )}
                </div>
            )}

            {/* Members list */}
            {tab === 'members' && (
                <>
                    {members.length === 0 ? (
                        <div className="flex flex-col items-center py-14 text-center">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-ink-faint">
                                <Users className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <p className="mt-3 text-sm font-semibold text-ink">{tMembers('emptyTitle')}</p>
                            <p className="mt-1 text-sm text-ink-muted">{tMembers('emptyBody')}</p>
                        </div>
                    ) : (
                        <ul>
                            {members.map((member) => (
                                <MemberRow
                                    key={member.id}
                                    member={member}
                                    canModerate={canModerate}
                                    canRemove={canModerate && member.role !== 'HOST'}
                                    canReport={canReport}
                                    joinedLabel={tMembers('joined', { date: formatDate(locale, member.joinedAt, { dateStyle: 'medium' }) })}
                                    roleLabel={member.role === 'HOST' ? tMembers('roleHost') : null}
                                    onReportAction={moderation.requestReport}
                                    onRemoveAction={moderation.requestRemove}
                                    reportLabel={tMembers('report')}
                                    removeLabel={tMembers('remove')}
                                />
                            ))}
                        </ul>
                    )}
                </>
            )}

            {/* Co-hosts */}
            {showCoHosts && (
                <>
                    {/* Co-host management */}
                    <CoHostManagementList canManage={isPrimaryHost && canWrite} eventId={eventId} hosts={hosts} members={members} />

                    {/* Co-host invitations */}
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs text-ink-muted">{t('invitations.coHosts.summary', { count: coHostInvitations.length })}</p>
                        {!showCreate && canCreate && (
                            <button
                                type="button"
                                onClick={handleShowCreate}
                                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                {t('invitations.coHosts.cta')}
                            </button>
                        )}
                    </div>

                    {!canWrite && (
                        <p className="mb-3 rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">
                            {t('invitations.readOnly')}
                        </p>
                    )}

                    {canCreate && !showCreate && (
                        <div className="mb-4 rounded-md bg-surface-muted/50 px-4 py-3">
                            <p className="text-sm font-semibold text-ink">{t('invitations.coHosts.guideTitle')}</p>
                            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('invitations.coHosts.guideBody')}</p>
                        </div>
                    )}

                    {showCreate && canCreate && <CreateCoHostInvitationForm eventId={eventId} onDoneAction={handleHideCreate} />}

                    <div className="flex flex-col divide-y divide-border">
                        {coHostInvitations.map((invitation) => (
                            <CoHostInvitationRow key={invitation.id} eventId={eventId} invitation={invitation} canWrite={canWrite} />
                        ))}
                    </div>

                    {coHostInvitations.length === 0 && !showCreate && (
                        <ToolEmptyState
                            title={t('invitations.coHosts.emptyTitle')}
                            body={t('invitations.coHosts.emptyBody')}
                            icon={UserCog}
                            className="py-8"
                        />
                    )}
                </>
            )}

            {/* Remove member confirmation */}
            <ConfirmActionModal
                open={moderation.memberToRemove !== null}
                onCloseAction={moderation.closeRemove}
                onConfirmAction={handleConfirmRemove}
                title={tMembers('removeConfirmTitle')}
                body={
                    <>
                        {tMembers('removeConfirmBody', { name: moderation.memberToRemove?.displayName ?? '' })}
                        {moderation.removeError && <span className="mt-1 block text-destructive">{moderation.removeError}</span>}
                    </>
                }
                confirmLabel={tMembers('remove')}
                cancelLabel={tMembers('cancel')}
                isConfirming={moderation.isRemoving}
            />

            {/* Report member */}
            {moderation.memberToReport && (
                <ReportTargetModal
                    open
                    eventId={eventId}
                    targetType="MEMBER"
                    targetId={moderation.memberToReport.id}
                    targetName={moderation.memberToReport.displayName}
                    onCloseAction={moderation.closeReport}
                />
            )}
        </div>
    );
}
