import { useLocale, useTranslations } from 'next-intl';

import Section from '@/components/manage/Section';
import { type BillingDerived, type BillingInsights, useBillingDate } from '@/hooks/useEventBillingPanel';
import { formatMoney } from '@/lib/billing';

export function BillingCoveragePanel({
    derived,
    insights,
}: {
    derived: BillingDerived;
    insights: BillingInsights;
}) {
    const t = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();
    const formatDate = useBillingDate();

    return (
        <div className="flex flex-col gap-5 text-sm">
            {/* Activation */}
            <Section title={t('activation.title')}>
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
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">{t('activation.permanent')}</p>
            </Section>

            {/* Add-ons */}
            <Section title={t('addons.title')} divider>
                <dl className="space-y-2">
                    <div className="flex justify-between gap-4">
                        <dt className="text-ink-muted">{t('addons.total')}</dt>
                        <dd className="text-right font-semibold text-ink">
                            {formatMoney(locale, derived.addonTotal, insights.orderCurrency)}
                        </dd>
                    </div>
                </dl>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">{t('addons.ownedHint')}</p>
            </Section>
        </div>
    );
}
