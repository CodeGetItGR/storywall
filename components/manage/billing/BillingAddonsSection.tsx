import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import Section from '@/components/manage/Section';
import type { BillingData } from '@/hooks/useEventBillingPanel';
import { formatMoney } from '@/lib/billing';
import { routes } from '@/lib/routes';

/** The add-ons this event owns, next to the one way to change them. */
export function BillingAddonsSection({
    eventId,
    addons,
    currency,
    canManage,
}: {
    eventId: string;
    addons: BillingData['addons'];
    currency: string;
    canManage: boolean;
}) {
    const t = useTranslations('EventPlanSettingsPage.addons');
    const locale = useLocale();

    if (addons.length === 0 && !canManage) return null;

    return (
        <Section
            title={t('manageTitle')}
            divider
            action={
                canManage && (
                    <Link
                        href={routes.events.settingsAddons(eventId)}
                        className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-surface-muted px-4 text-xs font-semibold text-ink"
                    >
                        {t('manageAction')}
                    </Link>
                )
            }
        >
            {/* Owned add-ons */}
            {addons.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                    {addons.map((addon, index) => (
                        <li
                            key={`${addon.code}-${addon.activatedAt}-${index}`}
                            className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink"
                        >
                            {t(addon.billingPeriod === 'ONE_TIME' ? 'itemOnce' : 'item', {
                                name: addon.name,
                                price: formatMoney(locale, addon.priceAmountMinor, currency),
                            })}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            )}
        </Section>
    );
}
