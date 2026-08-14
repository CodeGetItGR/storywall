'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

type UsageItem = {
    key: 'storage' | 'members' | 'activeEvents';
    used: number;
    limit: number | null;
    percent: number;
    valueLabel: string;
};

type UsagePanelProps = {
    title: string;
    planName: string;
    items: UsageItem[];
    includedModuleKeys?: string[];
    nextPlanName?: string;
    upgradeHref?: string;
    className?: string;
};

function clampPercent(percent: number): number {
    return Math.max(0, Math.min(100, percent));
}

export function UsagePanel({ title, planName, items, includedModuleKeys = [], nextPlanName, upgradeHref, className }: UsagePanelProps) {
    const t = useTranslations('PlanUsage');
    const tModules = useTranslations('Modules');

    return (
        <section className={cn('space-y-3', className)}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{title}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{t('currentPlan', { plan: planName })}</p>
                </div>
                {nextPlanName &&
                    (upgradeHref ? (
                        <Link
                            href={upgradeHref}
                            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary-dark transition-opacity hover:opacity-90"
                        >
                            {t('upgradeTo', { plan: nextPlanName })}
                            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                    ) : (
                        <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary-dark">
                            {t('upgradeTo', { plan: nextPlanName })}
                            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                        </div>
                    ))}
            </div>

            <div className="space-y-3">
                {items.map((item) => {
                    const hasLimit = item.limit !== null;
                    const isOverLimit = hasLimit && item.percent > 100;

                    return (
                        <div key={item.key}>
                            <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="font-medium text-ink">{t(`items.${item.key}`)}</span>
                                <span className={cn('text-ink-muted tabular-nums', isOverLimit && 'font-semibold text-destructive')}>
                                    {item.valueLabel}
                                </span>
                            </div>
                            {hasLimit && (
                                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
                                    <div
                                        className={cn('h-full rounded-full bg-primary transition-all', isOverLimit && 'bg-destructive')}
                                        style={{ width: `${clampPercent(item.percent)}%` }}
                                    />
                                </div>
                            )}
                            {!hasLimit && <p className="mt-1 text-[11px] text-ink-faint">{t('unlimited')}</p>}
                        </div>
                    );
                })}
            </div>

            {includedModuleKeys.length > 0 && (
                <div className="border-t border-border pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('includedModules')}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {includedModuleKeys.map((moduleKey) => (
                            <span key={moduleKey} className="rounded-full bg-surface-muted px-2 py-1 text-[11px] font-medium text-ink-muted">
                                {tModules.has(`${moduleKey}.name`) ? tModules(`${moduleKey}.name`) : moduleKey}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
