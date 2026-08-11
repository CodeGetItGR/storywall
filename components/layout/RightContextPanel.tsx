'use client';

import { CreditCard, LayoutDashboard, MessageSquareText, Settings2, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { UsagePanel } from '@/components/plan/UsagePanel';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventUsage } from '@/hooks/useUsage';
import { formatBytes } from '@/lib/format';
import { findNextPlan, findPlanByCode } from '@/lib/planTiers';
import { routes } from '@/lib/routes';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

function hostLinks(eventId: string) {
    return [
        { key: 'manage', href: routes.manage, icon: LayoutDashboard },
        { key: 'rsvps', href: routes.tools.rsvp, icon: Ticket },
        { key: 'invitations', href: routes.auth.manage({ tab: 'invitations' }), icon: MessageSquareText },
        { key: 'settings', href: routes.auth.manage({ tab: 'settings' }), icon: Settings2 },
        { key: 'billing', href: routes.events.settingsPlan(eventId), icon: CreditCard },
    ] as const;
}

export function RightContextPanel() {
    const t = useTranslations('RightContextPanel');
    const locale = useLocale();
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isLoading = useEventContextLoading();
    const { data: eventUsage = null } = useEventUsage(activeEvent?.id ?? null);
    const { data: appConfig } = useAppConfig();

    if (isLoading || !activeEvent || !isHost) return null;

    const eventDate = new Date(activeEvent.schedule.startAt);
    const eventDateLabel = eventDate.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
    const enabledModuleCount = activeEvent.modules.filter((module) => module.isAvailable).length;
    const currentPlan = eventUsage ? findPlanByCode(appConfig?.planTiers ?? [], 'EVENT', eventUsage.planTier) : undefined;
    const nextPlan = eventUsage ? findNextPlan(appConfig?.planTiers ?? [], 'EVENT', eventUsage.planTier) : undefined;
    const moduleNamesByKey = new Map((appConfig?.modules ?? []).map((module_) => [module_.moduleKey, module_.name]));
    const includedModules = currentPlan?.moduleKeys.map((moduleKey) => moduleNamesByKey.get(moduleKey) ?? moduleKey) ?? [];

    return (
        <aside
            aria-label={t('hostConsole')}
            className="fixed right-0 top-0 z-30 hidden h-screen w-75 flex-col overflow-y-auto border-l border-border bg-background no-scrollbar xl:flex"
        >
            <div className="flex flex-col gap-5 p-5">
                <div className="rounded-[1.5rem] border border-border bg-linear-to-b from-surface-muted to-card p-4 shadow-[0_12px_30px_rgba(36,31,26,0.05)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">{t('hostConsole')}</p>
                    <h2 className="mt-2 text-lg font-semibold leading-tight text-ink text-balance">{activeEvent.title}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{eventDateLabel}</p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-background/70 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">{t('hostQuickLinks')}</p>
                            <p className="mt-1 text-sm font-medium text-ink">{t('dashboard')}</p>
                        </div>
                        <div className="rounded-2xl bg-background/70 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">{t('activeModules')}</p>
                            <p className="mt-1 text-sm font-medium text-ink tabular-nums">{enabledModuleCount}</p>
                        </div>
                    </div>
                </div>

                {eventUsage && (
                    <UsagePanel
                        title={t('usageTitle')}
                        planName={currentPlan?.name ?? eventUsage.planTier}
                        nextPlanName={nextPlan?.name}
                        upgradeHref={routes.events.settingsPlan(activeEvent.id)}
                        includedModules={includedModules}
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
                    <div className="space-y-2">
                        {hostLinks(activeEvent.id).map(({ key, href, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_10px_24px_rgba(36,31,26,0.06)]"
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-muted transition-colors group-hover:bg-primary-light group-hover:text-primary-dark">
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium text-ink">{t(`links.${key}`)}</span>
                                    <span className="block text-xs text-ink-muted">{t(`helper.${key}`)}</span>
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </aside>
    );
}
