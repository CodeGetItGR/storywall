import { Clock, Ticket, Users } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ElementType } from 'react';

import { GiftAccountSetup } from '@/components/manage/GiftAccountSetup';
import Section from '@/components/manage/Section';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { useEventBilling } from '@/hooks/useBilling';
import type {
    EventModuleResponseDto,
    EventUsageResponseDto,
    PaidServiceResponseDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';
import { discountedAmountMinor, formatMoney } from '@/lib/billing';
import { formatBytes } from '@/lib/format';
import { findNextPlan, findPlanByCode } from '@/lib/planTiers';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

function Stat({ label, value, sub, color, Icon }: { label: string; value: string; sub: string; color: string; Icon: ElementType }) {
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
    memberCount,
    daysToGo,
    invitationCount,
    rsvpBreakdown,
    eventUsage,
    planTiers,
    paidServices,
    modules,
    eventModules,
    onSeeAllRsvp,
    onSeeAllInvitations,
    eventId,
    eventStatus,
    endAt,
}: {
    memberCount: number;
    daysToGo: number;
    invitationCount: number;
    rsvpBreakdown: readonly { key: string; count: number; color: string }[];
    eventUsage: EventUsageResponseDto | null;
    planTiers: PlanTierResponseDto[];
    paidServices: PaidServiceResponseDto[];
    modules: PlatformModuleResponseDto[];
    eventModules: EventModuleResponseDto[];
    onSeeAllRsvp: () => void;
    onSeeAllInvitations: () => void;
    eventId: string;
    eventStatus: 'DRAFT' | 'ACTIVE' | 'FROZEN' | 'PURGED';
    endAt: string | null;
}) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();
    const billing = useEventBilling(eventId, eventStatus === 'DRAFT');
    const canPay = eventStatus === 'DRAFT' && Boolean(endAt);
    const currentPlan = eventUsage ? findPlanByCode(planTiers, 'EVENT', eventUsage.planTier) : undefined;
    const nextPlan = eventUsage ? findNextPlan(planTiers, 'EVENT', eventUsage.planTier) : undefined;
    const originalsService = paidServices.find(
        (service) =>
            service.code === 'ORIGINALS' &&
            service.kind === 'RECURRING_ADDON' &&
            (service.planTierIds.length === 0 || (currentPlan ? service.planTierIds.includes(currentPlan.id) : false))
    );
    const originalsActive = billing.data?.addons.some((addon) => addon.code === 'ORIGINALS') ?? false;
    const activeAddonCodes = new Set(billing.data?.addons.map((addon) => addon.code) ?? []);
    const moduleUnlocks = paidServices.filter(
        (service) =>
            service.kind === 'MODULE_UNLOCK' &&
            service.grantsModuleKey &&
            !currentPlan?.moduleKeys.includes(service.grantsModuleKey) &&
            (service.planTierIds.length === 0 || (currentPlan ? service.planTierIds.includes(currentPlan.id) : false))
    );
    const activationAddonAmount =
        originalsService && currentPlan?.includedMonths ? originalsService.priceAmountMinor * currentPlan.includedMonths : 0;
    const activationTotal =
        currentPlan?.priceAmountMinor === null || currentPlan?.priceAmountMinor === undefined
            ? null
            : discountedAmountMinor(currentPlan.priceAmountMinor, currentPlan) +
              (originalsActive ? activationAddonAmount : 0) +
              moduleUnlocks
                  .filter((service) => activeAddonCodes.has(service.code))
                  .reduce(
                      // A ONE_TIME unlock is a flat charge — it ignores includedMonths and is
                      // charged even when includedMonths is 0, unlike a MONTHLY module or ORIGINALS.
                      (sum, service) =>
                          sum +
                          (service.billingPeriod === 'ONE_TIME'
                              ? service.priceAmountMinor
                              : service.priceAmountMinor * (currentPlan.includedMonths ?? 1)),
                      0
                  );

    const selectedAddons = billing.data?.addons ?? [];
    const rsvpTotal = rsvpBreakdown.reduce((sum, r) => sum + r.count, 0) || 1;
    const globallyEnabledModules = modules.filter((module_) => module_.isEnabled);
    const enabledModuleKeys = new Set(globallyEnabledModules.map((module_) => module_.moduleKey));
    const availableModuleKeys = new Set(eventModules.filter((module) => module.isAvailable).map((module) => module.moduleKey));
    const wishlistAvailable = availableModuleKeys.has('wishlist') || moduleUnlocks.some((service) => activeAddonCodes.has(service.code));
    const includedModuleKeys =
        currentPlan?.moduleKeys.filter((moduleKey) => enabledModuleKeys.has(moduleKey) && availableModuleKeys.has(moduleKey)) ?? [];

    return (
        <div className="flex flex-col gap-4 px-4 sm:gap-5">
            {eventStatus === 'DRAFT' && (
                <div className="border-l-2 border-primary pl-3">
                    <p className="text-sm font-bold text-ink">{t('draft.title')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('draft.body')}</p>
                    {selectedAddons.length > 0 && (
                        <div className="mt-3 border-t border-border/70 pt-3">
                            <p className="text-xs font-semibold text-ink">{t('draft.selectedAddons.title')}</p>
                            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('draft.selectedAddons.body')}</p>
                            <ul className="mt-2 space-y-1.5">
                                {selectedAddons.map((addon, index) => (
                                    <li
                                        key={`${addon.code}-${index}`}
                                        className="flex items-center justify-between gap-3 text-xs text-ink-muted"
                                    >
                                        <span className="truncate font-semibold text-ink">{addon.name}</span>
                                        <span className="shrink-0">
                                            {formatMoney(locale, addon.priceAmountMinor, currentPlan?.priceCurrency ?? 'EUR')}{' '}
                                            {addon.billingPeriod === 'ONE_TIME' ? t('draftModules.once') : t('draftModules.perMonth')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {wishlistAvailable && <GiftAccountSetup eventId={eventId} />}
                    {activationTotal !== null && currentPlan?.priceCurrency && (
                        <p className="mt-3 text-xs font-semibold text-ink">
                            {t('draft.activationTotal', { total: formatMoney(locale, activationTotal, currentPlan.priceCurrency) })}
                        </p>
                    )}
                    {canPay ? (
                        <Link
                            href={routes.events.checkoutReview(eventId, 'activation')}
                            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white sm:w-auto"
                        >
                            {t('draft.reviewAndPublish')}
                        </Link>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white opacity-40 sm:w-auto"
                        >
                            {t('draft.addEndDate')}
                        </button>
                    )}
                </div>
            )}
            {eventStatus !== 'DRAFT' && (
                <>
                    {/* Gift account */}
                    {wishlistAvailable && <GiftAccountSetup eventId={eventId} className="" />}

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
                    />

                    {eventUsage && (
                        <UsagePanel
                            className="rounded-none border-0 border-t border-border bg-transparent p-0 pt-4 shadow-none md:hidden"
                            title={t('usage.eventTitle')}
                            planName={currentPlan?.name ?? eventUsage.planTier}
                            nextPlanName={nextPlan?.name}
                            upgradeHref={routes.events.settingsPlan(eventId)}
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
                </>
            )}
        </div>
    );
}
