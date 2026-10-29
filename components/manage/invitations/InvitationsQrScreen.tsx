'use client';

import { QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { ShareLanguageNote } from '@/components/manage/invitations/ShareLanguageNote';
import { ShareLinkPanel } from '@/components/manage/invitations/ShareLinkPanel';
import { QrLinksListSkeleton } from '@/components/manage/ManageSkeletons';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useUpgradeOptions } from '@/hooks/useBilling';
import { useIsPrimaryHost } from '@/hooks/useIsPrimaryHost';
import { useEventQrLinks, useEventQrLinkStats } from '@/hooks/useQrLinks';
import { useEventUsage } from '@/hooks/useUsage';
import { isEventWritable } from '@/lib/eventLifecycle';
import { findPlanByCode } from '@/lib/planTiers';
import { routes } from '@/lib/routes';

export function InvitationsQrScreen() {
    const t = useTranslations('ManagePage');
    const tPage = useTranslations('InvitationsQrPage');
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    // A planner (QR_READ) sees the links only: stats, usage, upgrades and edits stay with hosts.
    const hostEventId = isHost ? eventId : null;
    const { data: qrLinks = [], isLoading: qrLinksLoading } = useEventQrLinks(eventId);
    const { data: qrLinkStats = [], isLoading: statsLoading } = useEventQrLinkStats(hostEventId);
    const { data: eventUsage = null, isLoading: usageLoading } = useEventUsage(hostEventId);
    const isPrimaryHost = useIsPrimaryHost();
    const { data: upgradeOptions = [], isLoading: upgradesLoading } = useUpgradeOptions(eventId, isHost && isPrimaryHost);
    const { data: appConfig } = useAppConfig();
    const [limitNotice, setLimitNotice] = useState<string | null>(null);

    const isWritable = isEventWritable(activeEvent?.status);
    const canWrite = isHost && isWritable;
    const memberLimit = eventUsage?.memberLimit ?? null;
    const memberCount = eventUsage?.memberCount ?? 0;
    const isFull = memberLimit !== null && memberCount >= memberLimit;
    const currentPlan = eventUsage ? findPlanByCode(appConfig?.planTiers ?? [], 'EVENT', eventUsage.planTier) : undefined;
    const nextUpgradeOption = upgradeOptions[0];
    const isLoading = qrLinksLoading || statsLoading || usageLoading || upgradesLoading;
    // The gallery upload code has its own dedicated page and its own summary
    // row in the right context panel (see QrLinksSection) — exclude it here
    // so this "Share links" list and its count only cover join-type links.
    const shareQrLinks = qrLinks.filter((qrLink) => qrLink.targetType !== 'MEDIA_UPLOAD');

    const handleClampNotice = useCallback((message: string) => setLimitNotice(message), []);

    return (
        <ModulePageShell
            maxWidth="2xl"
            title={tPage('title')}
            icon={QrCode}
            backLabel={tPage('back')}
            backHref={routes.events.feed(eventId)}
            subtitle={tPage('subtitle')}
        >
            {isLoading ? (
                <QrLinksListSkeleton />
            ) : (
                <>
                    {eventUsage && (
                        <div className="mb-8">
                            <UsagePanel
                                title={t('invitations.capacity.title')}
                                planName={currentPlan?.name ?? eventUsage.planTier}
                                nextPlanName={isFull ? nextUpgradeOption?.planTierName : undefined}
                                upgradeHref={routes.events.manage(eventId, { tab: 'billing' })}
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
                        </div>
                    )}

                    {isHost && !isWritable && (
                        <p className="mb-3 rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">{t('qr.readOnly')}</p>
                    )}

                    {limitNotice && (
                        <p className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
                            {limitNotice}
                        </p>
                    )}

                    {/* Share links */}
                    <div className="flex flex-col divide-y divide-border [&>*]:py-8 [&>*:first-child]:pt-0">
                        {shareQrLinks.map((qrLink) => {
                            const stats = qrLinkStats.find((row) => row.qrLinkId === qrLink.id);
                            return (
                                <ShareLinkPanel
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

                    {/* Link language */}
                    {shareQrLinks.length > 0 && <ShareLanguageNote />}

                    {shareQrLinks.length === 0 && (
                        <ToolEmptyState title={t('qr.emptyTitle')} body={t('qr.emptyBody')} icon={QrCode} className="py-8" />
                    )}
                </>
            )}
        </ModulePageShell>
    );
}
