'use client';

import { Plus, QrCode, UserCog, UserPlus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import {
    CreateCoHostInvitationForm,
    CreateInvitationForm,
    CreateQrLinkForm,
    type InvitationPanel,
    InvitationRow,
    QrLinkRow,
} from '@/components/manage/invitations';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { type SubTabItem, SubTabs } from '@/components/ui/SubTabs';
import type { EventInvitationResponseDto, EventUsageResponseDto, PlanTierResponseDto, QrLinkResponseDto, QrLinkStatsDto } from '@/lib/api/types';
import { findNextPlan, findPlanByCode } from '@/lib/planTiers';
import { routes } from '@/lib/routes';

export default function InvitationsTab({
    eventId,
    invitations,
    qrLinks,
    qrLinkStats,
    canWrite,
    eventUsage,
    planTiers,
}: {
    eventId: string;
    invitations: EventInvitationResponseDto[];
    qrLinks: QrLinkResponseDto[];
    qrLinkStats: QrLinkStatsDto[];
    canWrite: boolean;
    eventUsage: EventUsageResponseDto | null;
    planTiers: PlanTierResponseDto[];
}) {
    const t = useTranslations('ManagePage');
    const searchParams = useSearchParams();
    const requestedPanel = searchParams.get('section');
    const [showCreate, setShowCreate] = useState(false);
    const [panel, setPanel] = useState<InvitationPanel>(requestedPanel === 'qr' ? 'qr' : 'invites');
    const [limitNotice, setLimitNotice] = useState<string | null>(null);
    const tabs = useMemo<SubTabItem<InvitationPanel>[]>(
        () => [
            { key: 'invites', icon: UserPlus, label: t('invitations.panels.invites') },
            { key: 'coHosts', icon: UserCog, label: t('invitations.panels.coHosts') },
            { key: 'qr', icon: QrCode, label: t('invitations.panels.qr') },
        ],
        [t]
    );

    const memberLimit = eventUsage?.memberLimit ?? null;
    const memberCount = eventUsage?.memberCount ?? 0;
    const isFull = memberLimit !== null && memberCount >= memberLimit;
    const currentPlan = eventUsage ? findPlanByCode(planTiers, 'EVENT', eventUsage.planTier) : undefined;
    const nextPlan = eventUsage ? findNextPlan(planTiers, 'EVENT', eventUsage.planTier) : undefined;
    const upgradeHref = routes.events.manage(eventId, { tab: 'billing' });

    const canCreate = canWrite && !isFull;

    const handleShowCreate = useCallback(() => {
        if (!canCreate) return;
        setShowCreate(true);
    }, [canCreate]);

    const handleHideCreate = useCallback(() => {
        setShowCreate(false);
    }, []);

    const handlePanelSelect = useCallback((item: InvitationPanel) => {
        setPanel(item);
        setShowCreate(false);
        setLimitNotice(null);
    }, []);

    const handleClampNotice = useCallback((message: string) => {
        setLimitNotice(message);
    }, []);

    const showInvites = panel === 'invites';
    const showCoHosts = panel === 'coHosts';
    const visibleInvitations = invitations.filter((invitation) => invitation.role === (showCoHosts ? 'HOST' : 'ATTENDEE'));
    const emptyIcon = showCoHosts ? UserCog : showInvites ? UserPlus : QrCode;

    return (
        <div className="flex flex-col">
            {/* Panels */}
            <SubTabs tabs={tabs} active={panel} onSelectAction={handlePanelSelect} className="mb-4" />

            {/* Capacity */}
            {eventUsage && (
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

            {/* Summary */}
            <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-ink-muted">
                    {showCoHosts
                        ? t('invitations.coHosts.summary', { count: visibleInvitations.length })
                        : showInvites
                          ? t('invitationsCard.summary', { count: visibleInvitations.length })
                          : t('qr.summary', { count: qrLinks.length })}
                </p>
                {!showCreate && canCreate && (
                    <button
                        type="button"
                        onClick={handleShowCreate}
                        className="flex items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        {showCoHosts ? t('invitations.coHosts.cta') : showInvites ? t('invitations.create.cta') : t('qr.create.cta')}
                    </button>
                )}
            </div>

            {!canWrite && (
                <p className="mb-3 rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">
                    {showInvites || showCoHosts ? t('invitations.readOnly') : t('qr.readOnly')}
                </p>
            )}

            {limitNotice && (
                <p className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">{limitNotice}</p>
            )}

            {/* Guidance */}
            {canCreate && !showCreate && (
                <div className="mb-4 rounded-md bg-surface-muted/50 px-4 py-3">
                    <p className="text-sm font-semibold text-ink">
                        {showCoHosts
                            ? t('invitations.coHosts.guideTitle')
                            : showInvites
                              ? t('invitations.guide.personalTitle')
                              : t('invitations.guide.shareTitle')}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                        {showCoHosts
                            ? t('invitations.coHosts.guideBody')
                            : showInvites
                              ? t('invitations.guide.personalBody')
                              : t('invitations.guide.shareBody')}
                    </p>
                </div>
            )}

            {/* Create */}
            {showCreate && canCreate && showInvites && (
                <CreateInvitationForm eventId={eventId} onDoneAction={handleHideCreate} onClampNoticeAction={handleClampNotice} />
            )}
            {showCreate && canCreate && showCoHosts && <CreateCoHostInvitationForm eventId={eventId} onDoneAction={handleHideCreate} />}
            {showCreate && canCreate && !showInvites && !showCoHosts && (
                <CreateQrLinkForm eventId={eventId} onDoneAction={handleHideCreate} onClampNoticeAction={handleClampNotice} />
            )}

            {/* List */}
            {showInvites || showCoHosts ? (
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
            ) : (
                <div className="flex flex-col divide-y divide-border">
                    {qrLinks.map((qrLink) => {
                        const stats = qrLinkStats.find((row) => row.qrLinkId === qrLink.id);
                        return (
                            <QrLinkRow
                                key={qrLink.id}
                                eventId={eventId}
                                qrLink={qrLink}
                                stats={stats}
                                canWrite={canWrite}
                                onClampNoticeAction={handleClampNotice}
                            />
                        );
                    })}
                </div>
            )}

            {/* Empty state */}
            {(showInvites || showCoHosts) && visibleInvitations.length === 0 && !showCreate && (
                <ToolEmptyState
                    title={t(showCoHosts ? 'invitations.coHosts.emptyTitle' : 'invitations.emptyTitle')}
                    body={t(showCoHosts ? 'invitations.coHosts.emptyBody' : 'invitations.emptyBody')}
                    icon={emptyIcon}
                    className="py-8"
                />
            )}
            {!showInvites && !showCoHosts && qrLinks.length === 0 && !showCreate && (
                <ToolEmptyState title={t('qr.emptyTitle')} body={t('qr.emptyBody')} icon={emptyIcon} className="py-8" />
            )}
        </div>
    );
}
