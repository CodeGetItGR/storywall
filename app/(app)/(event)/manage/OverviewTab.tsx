import { Clock, Loader2, Ticket, Users } from 'lucide-react';
import type { useTranslations } from 'next-intl';
import { useState } from 'react';

import Section from '@/components/manage/Section';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { useCheckout } from '@/hooks/useBilling';
import { getErrorMessage } from '@/lib/api/errors';
import type { EventUsageResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { checkoutSuccessUrl } from '@/lib/billing';
import { formatBytes } from '@/lib/format';
import { findNextPlan, findPlanByCode } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

function Stat({ label, value, sub, color, Icon }: { label: string; value: string; sub: string; color: string; Icon: React.ElementType }) {
    return (
        <div>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', color)}>
                <Icon className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <p className="text-2xl font-bold text-ink tabular-nums leading-none">{value}</p>
            <p className="text-xs font-semibold text-ink mt-1">{label}</p>
            <p className="text-[11px] text-ink-muted mt-0.5">{sub}</p>
        </div>
    );
}

export default function OverviewTab({
    t,
    memberCount,
    daysToGo,
    invitationCount,
    rsvpBreakdown,
    eventUsage,
    planTiers,
    modules,
    onSeeAllRsvp,
    onSeeAllInvitations,
    eventId,
    eventStatus,
    endAt,
}: {
    t: ReturnType<typeof useTranslations>;
    memberCount: number;
    daysToGo: number;
    invitationCount: number;
    rsvpBreakdown: readonly { key: string; count: number; color: string }[];
    eventUsage: EventUsageResponseDto | null;
    planTiers: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    onSeeAllRsvp: () => void;
    onSeeAllInvitations: () => void;
    eventId: string;
    eventStatus: 'DRAFT' | 'ACTIVE' | 'FROZEN' | 'PURGED';
    endAt: string | null;
}) {
    const checkout = useCheckout(eventId);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const canPay = eventStatus === 'DRAFT' && Boolean(endAt);
    async function startCheckout() {
        setCheckoutError(null);
        try {
            const result = await checkout.mutateAsync();
            const successUrl = checkoutSuccessUrl(window.location.origin, eventId, result.orderId);
            // The backend normally supplies its own return route. Preserve the order id for
            // local/manual providers and navigate the hosted checkout at top level.
            if (result.redirectUrl.includes('/checkout/success')) {
                window.location.href = successUrl;
            } else {
                window.location.href = result.redirectUrl;
            }
        } catch (error) {
            setCheckoutError(getErrorMessage(error));
        }
    }
    const rsvpTotal = rsvpBreakdown.reduce((sum, r) => sum + r.count, 0) || 1;
    const currentPlan = eventUsage ? findPlanByCode(planTiers, 'EVENT', eventUsage.planTier) : undefined;
    const nextPlan = eventUsage ? findNextPlan(planTiers, 'EVENT', eventUsage.planTier) : undefined;
    const moduleNamesByKey = new Map(modules.map((module_) => [module_.moduleKey, module_.name]));
    const includedModules = currentPlan?.moduleKeys.map((moduleKey) => moduleNamesByKey.get(moduleKey) ?? moduleKey) ?? [];

    return (
        <div className="px-4 flex flex-col gap-6">
            {eventStatus === 'DRAFT' && (
                <div className="rounded-2xl border border-primary/20 bg-primary-light p-4">
                    <p className="text-sm font-bold text-primary-dark">{t('draft.title')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-primary-dark/80">{t('draft.body')}</p>
                    {checkoutError && <p className="mt-2 text-xs text-rose-600">{checkoutError}</p>}
                    <button type="button" onClick={startCheckout} disabled={!canPay || checkout.isPending} className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                        {checkout.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {endAt ? t('draft.payAndPublish') : t('draft.addEndDate')}
                    </button>
                </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
                <Stat
                    label={t('stats.totalGuests.label')}
                    value={`${memberCount}`}
                    sub={t('stats.totalGuests.sub')}
                    color="bg-emerald-50 text-emerald-600"
                    Icon={Users}
                />
                <Stat
                    label={t('stats.daysToGo.label')}
                    value={`${daysToGo}`}
                    sub={t('stats.daysToGo.sub')}
                    color="bg-rose-50 text-rose-500"
                    Icon={Clock}
                />
                <Stat
                    label={t('stats.invitations.label')}
                    value={`${invitationCount}`}
                    sub={t('stats.invitations.sub')}
                    color="bg-sky-50 text-sky-600"
                    Icon={Ticket}
                />
            </div>

            <div className="h-px bg-border" />

            {eventUsage && (
                <>
                    <UsagePanel
                        title={t('usage.eventTitle')}
                        planName={currentPlan?.name ?? eventUsage.planTier}
                        nextPlanName={nextPlan?.name}
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

                    <div className="h-px bg-border" />
                </>
            )}

            <Section
                title={t('rsvpBreakdown.title')}
                action={
                    <button onClick={onSeeAllRsvp} className="text-xs text-primary font-semibold hover:underline">
                        {t('seeAll')}
                    </button>
                }
            >
                <div className="flex gap-2">
                    {rsvpBreakdown.map(({ key, count, color }) => {
                        const pct = Math.round((count / rsvpTotal) * 100);
                        return (
                            <div key={key} className="flex-1 text-center">
                                <p className="text-xl font-bold text-ink tabular-nums">{count}</p>
                                <div className="h-1.5 rounded-full bg-border my-1.5 overflow-hidden">
                                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-[10px] text-ink-muted">{t(`rsvpBreakdown.${key}`)}</p>
                            </div>
                        );
                    })}
                </div>
            </Section>

            <div className="h-px bg-border" />

            <Section
                title={t('invitationsCard.title')}
                action={
                    <button onClick={onSeeAllInvitations} className="text-xs text-primary font-semibold hover:underline">
                        {t('seeAll')}
                    </button>
                }
            >
                <p className="text-xs text-ink-muted">{t('invitationsCard.summary', { count: invitationCount })}</p>
            </Section>
        </div>
    );
}
