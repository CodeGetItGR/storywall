'use client';

import { Plus, QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { CreateQrLinkForm, QrLinkRow } from '@/components/manage/invitations';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventQrLinks, useEventQrLinkStats } from '@/hooks/useQrLinks';
import { useEventUsage } from '@/hooks/useUsage';
import { isEventWritable } from '@/lib/eventLifecycle';
import { findNextPlan, findPlanByCode } from '@/lib/planTiers';
import { routes } from '@/lib/routes';

export function InvitationsQrScreen() {
    const t = useTranslations('ManagePage');
    const tPage = useTranslations('InvitationsQrPage');
    const { activeEvent, eventId } = useEventRouteContext();
    const { data: qrLinks = [], isLoading: qrLinksLoading } = useEventQrLinks(eventId);
    const { data: qrLinkStats = [], isLoading: statsLoading } = useEventQrLinkStats(eventId);
    const { data: eventUsage = null, isLoading: usageLoading } = useEventUsage(eventId);
    const { data: appConfig } = useAppConfig();
    const [showCreate, setShowCreate] = useState(false);
    const [limitNotice, setLimitNotice] = useState<string | null>(null);

    const canWrite = isEventWritable(activeEvent?.status);
    const memberLimit = eventUsage?.memberLimit ?? null;
    const memberCount = eventUsage?.memberCount ?? 0;
    const isFull = memberLimit !== null && memberCount >= memberLimit;
    const currentPlan = eventUsage ? findPlanByCode(appConfig?.planTiers ?? [], 'EVENT', eventUsage.planTier) : undefined;
    const nextPlan = eventUsage ? findNextPlan(appConfig?.planTiers ?? [], 'EVENT', eventUsage.planTier) : undefined;
    const canCreate = canWrite && !isFull;
    const isLoading = qrLinksLoading || statsLoading || usageLoading;

    const handleShowCreate = useCallback(() => {
        if (canCreate) setShowCreate(true);
    }, [canCreate]);

    const handleHideCreate = useCallback(() => setShowCreate(false), []);
    const handleClampNotice = useCallback((message: string) => setLimitNotice(message), []);

    return (
        <ModulePageShell
            maxWidth="2xl"
            title={tPage('title')}
            icon={QrCode}
            backLabel={tPage('back')}
            backHref={routes.events.manage(eventId, { tab: 'members' })}
            subtitle={tPage('subtitle')}
        >
            {isLoading ? (
                <LoadingState size="md" className="min-h-64" />
            ) : (
                <>
                    {eventUsage && (
                        <div className="mb-4">
                            <UsagePanel
                                title={t('invitations.capacity.title')}
                                planName={currentPlan?.name ?? eventUsage.planTier}
                                nextPlanName={isFull ? nextPlan?.name : undefined}
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

                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs text-ink-muted">{t('qr.summary', { count: qrLinks.length })}</p>
                        {!showCreate && canCreate && (
                            <button
                                type="button"
                                onClick={handleShowCreate}
                                className="flex items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                {t('qr.create.cta')}
                            </button>
                        )}
                    </div>

                    {!canWrite && <p className="mb-3 rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">{t('qr.readOnly')}</p>}

                    {limitNotice && (
                        <p className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">{limitNotice}</p>
                    )}

                    {showCreate && canCreate && (
                        <CreateQrLinkForm eventId={eventId} qrLinks={qrLinks} onDoneAction={handleHideCreate} onClampNoticeAction={handleClampNotice} />
                    )}

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

                    {qrLinks.length === 0 && !showCreate && (
                        <ToolEmptyState title={t('qr.emptyTitle')} body={t('qr.emptyBody')} icon={QrCode} className="py-8" />
                    )}
                </>
            )}
        </ModulePageShell>
    );
}
