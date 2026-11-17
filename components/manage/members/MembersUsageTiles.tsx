'use client';

import { useTranslations } from 'next-intl';

import { useActiveModuleCopy } from '@/hooks/useModuleCopy';
import { cn } from '@/lib/utils';

type Usage = { used: number; limit: number | null; percent: number };

// M1: members and co-hosts side by side in one soft panel, the limit notices under it.
export function MembersUsageTiles({ members, coHosts, notices }: { members: Usage | null; coHosts: Usage | null; notices: string[] }) {
    const t = useTranslations('PlanUsage');
    const coHostsName = useActiveModuleCopy('co_hosts').name;
    if (!members && !coHosts) return null;

    return (
        <section className="flex flex-col gap-2">
            {/* Tiles */}
            <div
                className={cn(
                    'grid gap-4 rounded-[20px] bg-surface-muted px-4 py-3.5 sm:px-5 sm:py-4',
                    coHosts && members ? 'grid-cols-2' : 'grid-cols-1',
                )}
            >
                {members && <UsageTile label={t('items.members')} usage={members} unlimitedLabel={t('unlimited')} />}
                {coHosts && <UsageTile label={coHostsName} usage={coHosts} unlimitedLabel={t('unlimited')} />}
            </div>

            {/* Limit notices */}
            {notices.map((notice) => (
                <p key={notice} className="text-xs leading-relaxed text-amber-700">
                    {notice}
                </p>
            ))}
        </section>
    );
}

function UsageTile({ label, usage, unlimitedLabel }: { label: string; usage: Usage; unlimitedLabel: string }) {
    const over = usage.limit !== null && usage.percent > 100;
    return (
        <div className="flex flex-col gap-1.5">
            {/* Label */}
            <span className="text-xs font-semibold text-ink-muted">{label}</span>

            {/* Count */}
            <span className={cn('text-base font-bold text-ink tabular-nums', over && 'text-destructive')}>
                {usage.used}
                {usage.limit !== null && <span className="font-medium text-ink-muted"> {`/ ${usage.limit}`}</span>}
            </span>

            {/* Bar */}
            {usage.limit !== null ? (
                <span className="block h-1.5 overflow-hidden rounded-full bg-background">
                    <span
                        className={cn('block h-full rounded-full bg-gradient-brand', over && 'bg-destructive')}
                        style={{ width: `${Math.max(0, Math.min(100, usage.percent))}%` }}
                    />
                </span>
            ) : (
                <span className="text-[11px] text-ink-faint">{unlimitedLabel}</span>
            )}
        </div>
    );
}
