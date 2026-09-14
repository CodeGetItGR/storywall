'use client';

import { Plus, UserCog, UserPlus, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { CreateCoHostInvitationForm, CreateInvitationForm, InvitationRow } from '@/components/manage/invitations';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { ReportTargetModal } from '@/components/reports';
import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { type SubTabItem, SubTabs } from '@/components/ui/SubTabs';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useMemberModeration } from '@/hooks/useMemberModeration';
import type { EventInvitationResponseDto, EventMemberResponseDto, EventModuleResponseDto, EventUsageResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { findNextPlan, findPlanByCode } from '@/lib/planTiers';
import { routes } from '@/lib/routes';

import { MemberRow } from './MemberRow';

type MembersSubTab = 'members' | 'invites' | 'coHosts';

type MembersPanelProps = {
    canModerate: boolean;
    canWrite: boolean;
    eventId: string;
    members: EventMemberResponseDto[];
    invitations: EventInvitationResponseDto[];
    eventUsage: EventUsageResponseDto | null;
    planTiers: PlanTierResponseDto[];
    eventModules: EventModuleResponseDto[];
};

export function MembersPanel({ canModerate, canWrite, eventId, members, invitations, eventUsage, planTiers, eventModules }: MembersPanelProps) {
    const t = useTranslations('ManagePage');
    const tMembers = useTranslations('ManagePage.members');
    const locale = useLocale();
    const { data: appConfig } = useAppConfig();
    const searchParams = useSearchParams();
    const requestedTab = searchParams.get('section');
    const coHostsAvailable = eventModules.find((module_) => module_.moduleKey === 'co_hosts')?.isAvailable ?? false;
    const namedInvitesAvailable = eventModules.find((module_) => module_.moduleKey === 'named_invites')?.isAvailable ?? false;
    const [tab, setTab] = useState<MembersSubTab>(
        requestedTab === 'invites' || (requestedTab === 'coHosts' && coHostsAvailable) ? requestedTab : 'members'
    );
    const [showCreate, setShowCreate] = useState(false);
    const [limitNotice, setLimitNotice] = useState<string | null>(null);

    const moderation = useMemberModeration(eventId, members, canModerate);
    const handleConfirmRemove = useCallback(() => moderation.confirmRemove(tMembers('removeFailed')), [moderation, tMembers]);
    const canReport = canModerate && Boolean(appConfig?.reportTargetTypes?.includes('MEMBER'));

    const tabs = useMemo<SubTabItem<MembersSubTab>[]>(
        () => [
            { key: 'members', icon: Users, label: tMembers('title') },
            { key: 'invites', icon: UserPlus, label: t('invitations.panels.invites') },
            ...(coHostsAvailable ? [{ key: 'coHosts' as const, icon: UserCog, label: t('invitations.panels.coHosts') }] : []),
        ],
        [t, tMembers, coHostsAvailable]
    );

    const memberLimit = eventUsage?.memberLimit ?? null;
    const memberCount = eventUsage?.memberCount ?? 0;
    const isFull = memberLimit !== null && memberCount >= memberLimit;
    const currentPlan = eventUsage ? findPlanByCode(planTiers, 'EVENT', eventUsage.planTier) : undefined;
    const nextPlan = eventUsage ? findNextPlan(planTiers, 'EVENT', eventUsage.planTier) : undefined;
    const upgradeHref = routes.events.manage(eventId, { tab: 'billing' });

    const canCreate = canWrite && !isFull;

    const handleTabSelect = useCallback((next: MembersSubTab) => {
        setTab(next);
        setShowCreate(false);
        setLimitNotice(null);
    }, []);

    const handleShowCreate = useCallback(() => {
        if (!canCreate) return;
        setShowCreate(true);
    }, [canCreate]);

    const handleHideCreate = useCallback(() => {
        setShowCreate(false);
    }, []);

    const handleClampNotice = useCallback((message: string) => {
        setLimitNotice(message);
    }, []);

    const showInvites = tab === 'invites';
    const showCoHosts = tab === 'coHosts';
    const visibleInvitations = invitations.filter((invitation) => invitation.role === (showCoHosts ? 'HOST' : 'ATTENDEE'));

    return (
        <div className="flex flex-col">
            {/* Panels */}
            <SubTabs tabs={tabs} active={tab} onSelectAction={handleTabSelect} className="mb-4" />

            {/* Capacity */}
            {(showInvites || showCoHosts) && eventUsage && (
                <div className="mb-4">
                    <UsagePanel
                        title={t('invitations.capacity.title')}
                        planName={currentPlan?.name ?? eventUsage.planTier}
                        nextPlanName={isFull ? nextPlan?.name : undefined}
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
                    {moderation.attendees.length === 0 ? (
                        <div className="flex flex-col items-center py-14 text-center">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-ink-faint">
                                <Users className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <p className="mt-3 text-sm font-semibold text-ink">{tMembers('emptyTitle')}</p>
                            <p className="mt-1 text-sm text-ink-muted">{tMembers('emptyBody')}</p>
                        </div>
                    ) : (
                        <ul>
                            {moderation.attendees.map((member) => (
                                <MemberRow
                                    key={member.id}
                                    member={member}
                                    canModerate={canModerate}
                                    canReport={canReport}
                                    joinedLabel={tMembers('joined', { date: formatDate(locale, member.joinedAt, { dateStyle: 'medium' }) })}
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

            {/* Invites / co-hosts */}
            {(showInvites || showCoHosts) && (
                <>
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs text-ink-muted">
                            {showCoHosts
                                ? t('invitations.coHosts.summary', { count: visibleInvitations.length })
                                : t('invitationsCard.summary', { count: visibleInvitations.length })}
                        </p>
                        {!showCreate && canCreate && (
                            <button
                                type="button"
                                onClick={handleShowCreate}
                                className="flex items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                {showCoHosts ? t('invitations.coHosts.cta') : t('invitations.create.cta')}
                            </button>
                        )}
                    </div>

                    {!canWrite && <p className="mb-3 rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">{t('invitations.readOnly')}</p>}

                    {limitNotice && (
                        <p className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">{limitNotice}</p>
                    )}

                    {canCreate && !showCreate && (
                        <div className="mb-4 rounded-md bg-surface-muted/50 px-4 py-3">
                            <p className="text-sm font-semibold text-ink">
                                {showCoHosts ? t('invitations.coHosts.guideTitle') : t('invitations.guide.personalTitle')}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                                {showCoHosts ? t('invitations.coHosts.guideBody') : t('invitations.guide.personalBody')}
                            </p>
                        </div>
                    )}

                    {showCreate && canCreate && showInvites && (
                        <CreateInvitationForm
                            eventId={eventId}
                            onDoneAction={handleHideCreate}
                            onClampNoticeAction={handleClampNotice}
                            namedInvitesAvailable={namedInvitesAvailable}
                        />
                    )}
                    {showCreate && canCreate && showCoHosts && <CreateCoHostInvitationForm eventId={eventId} onDoneAction={handleHideCreate} />}

                    <div className="flex flex-col divide-y divide-border">
                        {visibleInvitations.map((invitation) => (
                            <InvitationRow
                                key={invitation.id}
                                eventId={eventId}
                                invitation={invitation}
                                canWrite={canWrite}
                                onClampNoticeAction={handleClampNotice}
                            />
                        ))}
                    </div>

                    {visibleInvitations.length === 0 && !showCreate && (
                        <ToolEmptyState
                            title={t(showCoHosts ? 'invitations.coHosts.emptyTitle' : 'invitations.emptyTitle')}
                            body={t(showCoHosts ? 'invitations.coHosts.emptyBody' : 'invitations.emptyBody')}
                            icon={showCoHosts ? UserCog : UserPlus}
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
