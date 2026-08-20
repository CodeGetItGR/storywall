import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import Section from '@/components/manage/Section';
import { type BillingDerived, type BillingInsights, useBillingDate } from '@/hooks/useEventBillingPanel';
import { formatMoney } from '@/lib/billing';
import { routes } from '@/lib/routes';

const coverageRows = ['paidThrough', 'freezesAt', 'purgesAt'] as const;

export function BillingCoveragePanel({
    eventId,
    derived,
    insights,
    onCancelSubscription,
}: {
    eventId: string;
    derived: BillingDerived;
    insights: BillingInsights;
    onCancelSubscription: () => void;
}) {
    const t = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();
    const formatDate = useBillingDate();
    const { coverage, subscription, subscriptionIsLive, subscriptionWillNotRenew, subscriptionPeriodEnd } = derived;
    const coverageValues = { paidThrough: coverage.paidThrough, freezesAt: coverage.freezesAt, purgesAt: coverage.purgesAt };

    return (
        <div className="flex flex-col gap-5 text-sm">
            {/* Coverage */}
            <Section>
                <dl className="space-y-2">
                    {coverageRows.map((row) => (
                        <div key={row} className="flex items-center justify-between gap-3">
                            <dt className="text-ink-muted">{t(`timeline.${row}.label`)}</dt>
                            <dd className="shrink-0 font-semibold text-ink">
                                {coverage.unlimited ? t('notApplicable') : formatDate(coverageValues[row])}
                            </dd>
                        </div>
                    ))}
                </dl>
                {coverage.unlimited && <p className="mt-2 text-xs font-semibold text-emerald-700">{t('timeline.unlimited')}</p>}
            </Section>

            {/* Subscription */}
            <Section title={t('subscription.title')} divider>
                <dl className="space-y-2">
                    <div className="flex justify-between gap-4">
                        <dt className="text-ink-muted">{t('subscription.status')}</dt>
                        <dd className="text-right font-semibold text-ink">
                            {subscriptionIsLive
                                ? subscriptionWillNotRenew
                                    ? t('subscription.notRenewing')
                                    : subscription?.status === 'PAST_DUE'
                                      ? t('subscriptionStatus.PAST_DUE')
                                      : t('subscriptionStatus.ACTIVE')
                                : subscription
                                  ? t(`subscriptionStatus.${subscription.status}`)
                                  : insights.hadSubscription
                                    ? t('subscription.ended')
                                    : t('subscription.none')}
                        </dd>
                    </div>
                    {/* The coverage rows above already show the coverage-until date, so only
                        repeat it here when it means something different - e.g. the event
                        stays live past the plan's own coverage date because it's cancelled. */}
                    {subscriptionPeriodEnd && subscriptionIsLive && (subscriptionWillNotRenew || subscriptionPeriodEnd !== coverage.paidThrough) && (
                        <div className="flex justify-between gap-4 text-xs">
                            <dt className="text-ink-muted">
                                {subscriptionWillNotRenew ? t('subscription.liveUntil') : t('subscription.currentPeriodEnd')}
                            </dt>
                            <dd className="text-right font-medium text-ink">{formatDate(subscriptionPeriodEnd)}</dd>
                        </div>
                    )}
                </dl>
                {subscriptionIsLive && (
                    <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                        {subscriptionWillNotRenew
                            ? t('subscription.willNotRenew', { date: formatDate(subscriptionPeriodEnd) })
                            : subscription?.status === 'PAST_DUE'
                              ? t('subscription.pastDue')
                              : t('subscription.renewsOn', { date: formatDate(subscriptionPeriodEnd) })}
                    </p>
                )}
                {subscriptionWillNotRenew && <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('subscription.noResume')}</p>}

                {/* Actions */}
                {(derived.canCancelSubscription || derived.canStartSubscription) && (
                    <div className="mt-3 space-y-2">
                        {derived.canStartSubscription && (
                            <>
                                <p className="text-xs leading-relaxed text-ink-muted">{t('subscription.renewalHint')}</p>
                                <Link
                                    href={routes.events.checkoutReview(eventId, 'renewal')}
                                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-4 text-xs font-semibold text-white sm:w-auto"
                                >
                                    {t('actions.reviewRenewal')}
                                </Link>
                            </>
                        )}
                        {derived.canCancelSubscription && (
                            <button
                                type="button"
                                onClick={onCancelSubscription}
                                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-surface-muted px-3 py-2 text-xs font-semibold text-ink sm:w-auto"
                            >
                                {t('subscription.cancel')}
                            </button>
                        )}
                    </div>
                )}
            </Section>

            {/* Activation */}
            <Section title={t('activation.title')} divider>
                <dl className="space-y-2">
                    <div className="flex justify-between gap-4">
                        <dt className="text-ink-muted">{t('activation.amount')}</dt>
                        <dd className="text-right font-semibold text-ink">
                            {insights.activationOrder
                                ? formatMoney(locale, insights.activationOrder.amountMinor, insights.activationOrder.currency)
                                : t('emptyDate')}
                        </dd>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                        <dt className="text-ink-muted">{t('activation.paidAt')}</dt>
                        <dd className="text-right font-medium text-ink">{formatDate(insights.activationOrder?.paidAt ?? null)}</dd>
                    </div>
                </dl>
            </Section>
        </div>
    );
}
