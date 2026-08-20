import { useTranslations } from 'next-intl';

import { GiftAccountSetup } from '@/components/manage/GiftAccountSetup';
import { OverviewDraftPanel } from '@/components/manage/OverviewDraftPanel';
import Section from '@/components/manage/Section';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { MetricStrip } from '@/components/ui/MetricStrip';
import { useEventOverviewPlan } from '@/hooks/useEventOverviewPlan';
import type {
    EventModuleResponseDto,
    EventUsageResponseDto,
    PaidServiceResponseDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';
import { formatBytes } from '@/lib/format';
import { routes } from '@/lib/routes';

export default function OverviewTab({
    memberCount,
    daysToGo,
    invitationCount,
    seatsClaimed,
    rsvpBreakdown,
    eventUsage,
    planTiers,
    paidServices,
    modules,
    eventModules,
    onSeeAllRsvp,
    eventId,
    eventStatus,
    endAt,
}: {
    memberCount: number;
    daysToGo: number;
    invitationCount: number;
    seatsClaimed: number;
    rsvpBreakdown: readonly { key: string; count: number; color: string }[];
    eventUsage: EventUsageResponseDto | null;
    planTiers: PlanTierResponseDto[];
    paidServices: PaidServiceResponseDto[];
    modules: PlatformModuleResponseDto[];
    eventModules: EventModuleResponseDto[];
    onSeeAllRsvp: () => void;
    eventId: string;
    eventStatus: 'DRAFT' | 'ACTIVE' | 'FROZEN' | 'PURGED';
    endAt: string | null;
}) {
    const t = useTranslations('ManagePage');
    const { currentPlan, nextPlan, selectedAddons, activationTotal, wishlistAvailable, includedModuleKeys } = useEventOverviewPlan({
        eventId,
        eventStatus,
        eventUsage,
        planTiers,
        paidServices,
        modules,
        eventModules,
    });

    if (eventStatus === 'DRAFT') {
        return (
            <OverviewDraftPanel
                eventId={eventId}
                canPay={Boolean(endAt)}
                currency={currentPlan?.priceCurrency ?? 'EUR'}
                selectedAddons={selectedAddons}
                activationTotal={currentPlan?.priceCurrency ? activationTotal : null}
                wishlistAvailable={wishlistAvailable}
            />
        );
    }

    const rsvpTotal = rsvpBreakdown.reduce((sum, entry) => sum + entry.count, 0);
    // The member count lives in this strip only: the usage panel below shows the
    // plan's headroom, so it reports storage and lets this cell carry members.
    const shownMemberCount = eventUsage?.memberCount ?? memberCount;
    const memberValue = eventUsage?.memberLimit ? `${shownMemberCount} / ${eventUsage.memberLimit}` : shownMemberCount;

    return (
        <div className="flex flex-col gap-5">
            {/* Gift account */}
            {wishlistAvailable && <GiftAccountSetup eventId={eventId} />}

            {/* Headline numbers */}
            <MetricStrip
                items={[
                    { key: 'members', label: t('stats.totalGuests.label'), value: memberValue },
                    { key: 'days', label: t('stats.daysToGo.label'), value: daysToGo },
                    { key: 'invitations', label: t('stats.invitations.label'), value: invitationCount },
                    { key: 'seats', label: t('stats.seats.label'), value: seatsClaimed },
                ]}
            />

            {/* RSVP */}
            <Section
                title={t('rsvpBreakdown.title')}
                divider
                action={
                    <button onClick={onSeeAllRsvp} className="text-xs font-semibold text-primary hover:underline">
                        {t('seeAll')}
                    </button>
                }
            >
                <div className="flex h-2 overflow-hidden rounded-full bg-surface-muted">
                    {rsvpBreakdown.map(({ key, count, color }) =>
                        count === 0 ? null : <div key={key} className={color} style={{ width: `${(count / Math.max(rsvpTotal, 1)) * 100}%` }} />
                    )}
                </div>
                <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                    {rsvpBreakdown.map(({ key, count, color }) => (
                        <div key={key} className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />
                            <dt className="text-xs text-ink-muted">{t(`rsvpBreakdown.${key}`)}</dt>
                            <dd className="text-xs font-bold tabular-nums text-ink">{count}</dd>
                        </div>
                    ))}
                </dl>
            </Section>

            {/* Plan usage */}
            {eventUsage && (
                <UsagePanel
                    className="rounded-none border-0 border-t border-border bg-transparent p-0 pt-4 shadow-none"
                    title={t('usage.eventTitle')}
                    planName={currentPlan?.name ?? eventUsage.planTier}
                    nextPlanName={nextPlan?.name}
                    upgradeHref={routes.auth.manage({ tab: 'billing' })}
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
                    ]}
                />
            )}
        </div>
    );
}
