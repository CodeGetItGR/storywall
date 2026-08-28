'use client';

import { Images, LayoutDashboard, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { UsagePanel } from '@/components/plan/UsagePanel';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventUsage } from '@/hooks/useUsage';
import { formatBytes } from '@/lib/format';
import { findNextPlan, findPlanByCode } from '@/lib/planTiers';
import { routes } from '@/lib/routes';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

export function RightContextPanel() {
    const t = useTranslations('RightContextPanel');
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isLoading = useEventContextLoading();
    const { data: eventUsage = null } = useEventUsage(activeEvent?.id ?? null);
    const { data: appConfig } = useAppConfig();

    if (isLoading || !activeEvent || !isHost) return null;

    // Dashboard sections are reached from the dashboard itself, so this panel
    // links to it once instead of repeating its sections as separate destinations.
    const hostLinks = [
        { key: 'manage', href: routes.events.manage(activeEvent.id), icon: LayoutDashboard },
        { key: 'gallery', href: routes.events.tools.gallery(activeEvent.id), icon: Images },
        { key: 'rsvps', href: routes.events.tools.rsvp(activeEvent.id), icon: Ticket },
    ] as const;

    const currentPlan = eventUsage ? findPlanByCode(appConfig?.planTiers ?? [], 'EVENT', eventUsage.planTier) : undefined;
    const nextPlan = eventUsage ? findNextPlan(appConfig?.planTiers ?? [], 'EVENT', eventUsage.planTier) : undefined;
    const globallyEnabledModules = (appConfig?.modules ?? []).filter((module_) => module_.isEnabled);
    const enabledModuleKeys = new Set(globallyEnabledModules.map((module_) => module_.moduleKey));
    const availableModuleKeys = new Set(activeEvent.modules.filter((module) => module.isAvailable).map((module) => module.moduleKey));
    const includedModuleKeys =
        currentPlan?.moduleKeys.filter((moduleKey) => enabledModuleKeys.has(moduleKey) && availableModuleKeys.has(moduleKey)) ?? [];

    return (
        <aside
            aria-label={t('hostConsole')}
            className="fixed right-0 top-0 z-30 hidden h-screen w-75 flex-col overflow-y-auto border-l border-border bg-background no-scrollbar xl:flex"
        >
            <div className="flex flex-col gap-5 p-5">
                {eventUsage && (
                    <UsagePanel
                        title={t('usageTitle')}
                        planName={currentPlan?.name ?? eventUsage.planTier}
                        nextPlanName={nextPlan?.name}
                        upgradeHref={routes.events.manage(activeEvent.id, { tab: 'billing' })}
                        includedModuleKeys={includedModuleKeys}
                        items={[
                            {
                                key: 'storage',
                                used: eventUsage.storageBytes,
                                limit: eventUsage.storageLimitBytes,
                                percent: eventUsage.storagePercent,
                                valueLabel:
                                    eventUsage.storageLimitBytes === null
                                        ? formatBytes(eventUsage.storageBytes)
                                        : `${formatBytes(eventUsage.storageBytes)} / ${formatBytes(eventUsage.storageLimitBytes)}`,
                            },
                            {
                                key: 'members',
                                used: eventUsage.memberCount,
                                limit: eventUsage.memberLimit,
                                percent: eventUsage.memberPercent,
                                valueLabel:
                                    eventUsage.memberLimit === null
                                        ? `${eventUsage.memberCount}`
                                        : `${eventUsage.memberCount} / ${eventUsage.memberLimit}`,
                            },
                        ]}
                    />
                )}

                <div>
                    <p className="mb-2 text-sm font-semibold text-ink">{t('hostActions')}</p>
                    <div className="space-y-1">
                        {hostLinks
                            .filter(({ key }) => activeEvent.status !== 'DRAFT' || key === 'manage')
                            .map(({ key, href, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                                >
                                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                    <span className="min-w-0 truncate">{t(`links.${key}`)}</span>
                                </Link>
                            ))}
                    </div>
                </div>
            </div>
        </aside>
    );
}
