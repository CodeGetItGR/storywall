import { Clock, Loader2, Ticket, Users } from 'lucide-react';
import type { useTranslations } from 'next-intl';
import { useState } from 'react';

import Section from '@/components/manage/Section';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { useApiErrorMessage, useRetryAfterCountdown } from '@/hooks/useApiErrorMessage';
import { useCheckout } from '@/hooks/useBilling';
import type { EventUsageResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { checkoutSuccessUrl } from '@/lib/billing';
import { formatBytes } from '@/lib/format';
import { findNextPlan, findPlanByCode } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

function Stat({ label, value, sub, color, Icon }: { label: string; value: string; sub: string; color: string; Icon: React.ElementType }) {
    return (
        <div>
            <Icon className={cn('h-4 w-4', color)} strokeWidth={1.8} aria-hidden="true" />
            <p className="mt-2 text-xl font-bold leading-none tabular-nums text-ink sm:text-2xl">{value}</p>
            <p className="mt-1 text-[11px] font-semibold leading-tight text-ink sm:text-xs">{label}</p>
            <p className="mt-0.5 hidden text-[11px] text-ink-muted sm:block">{sub}</p>
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
    const toErrorMessage = useApiErrorMessage();
    const checkoutRetryIn = useRetryAfterCountdown(checkout.error);
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
            setCheckoutError(toErrorMessage(error));
        }
    }
    const rsvpTotal = rsvpBreakdown.reduce((sum, r) => sum + r.count, 0) || 1;
    const currentPlan = eventUsage ? findPlanByCode(planTiers, 'EVENT', eventUsage.planTier) : undefined;
    const nextPlan = eventUsage ? findNextPlan(planTiers, 'EVENT', eventUsage.planTier) : undefined;
    const moduleNamesByKey = new Map(modules.map((module_) => [module_.moduleKey, module_.name]));
    const includedModules = currentPlan?.moduleKeys.map((moduleKey) => moduleNamesByKey.get(moduleKey) ?? moduleKey) ?? [];

    return (
        <div className="flex flex-col gap-4 px-4 sm:gap-5">
            {eventStatus === 'DRAFT' && (
                <div className="border-l-2 border-primary pl-3">
                    <p className="text-sm font-bold text-ink">{t('draft.title')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('draft.body')}</p>
                    {checkoutError && <p className="mt-2 text-xs text-rose-600">{checkoutError}</p>}
                    <button type="button" onClick={startCheckout} disabled={!canPay || checkout.isPending || checkoutRetryIn > 0} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">
                        {checkout.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {checkoutRetryIn > 0 ? t('draft.retryIn', { seconds: checkoutRetryIn }) : endAt ? t('draft.payAndPublish') : t('draft.addEndDate')}
                    </button>
                </div>
            )}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <Stat
                    label={t('stats.totalGuests.label')}
                    value={`${memberCount}`}
                    sub={t('stats.totalGuests.sub')}
                    color="text-emerald-600"
                    Icon={Users}
                />
                <Stat
                    label={t('stats.daysToGo.label')}
                    value={`${daysToGo}`}
                    sub={t('stats.daysToGo.sub')}
                    color="text-rose-500"
                    Icon={Clock}
                />
                <Stat
                    label={t('stats.invitations.label')}
                    value={`${invitationCount}`}
                    sub={t('stats.invitations.sub')}
                    color="text-sky-600"
                    Icon={Ticket}
                />
            </div>

            <Section
                title={t('rsvpBreakdown.title')}
                className="border-t border-border pt-4"
                action={
                    <button onClick={onSeeAllRsvp} className="text-xs font-semibold text-primary hover:underline">
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
                                <div className="my-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-[10px] leading-tight text-ink-muted">{t(`rsvpBreakdown.${key}`)}</p>
                            </div>
                        );
                    })}
                </div>
            </Section>

            <Section
                title={t('invitationsCard.title')}
                className="border-t border-border pt-4"
                action={
                    <button onClick={onSeeAllInvitations} className="text-xs font-semibold text-primary hover:underline">
                        {t('seeAll')}
                    </button>
                }
            >
                <p className="text-xs text-ink-muted">{t('invitationsCard.summary', { count: invitationCount })}</p>
            </Section>

            {eventUsage && (
                <>
                    <UsagePanel
                        className="rounded-none border-0 border-t border-border bg-transparent p-0 pt-4 shadow-none"
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
                </>
            )}
        </div>
    );
}
