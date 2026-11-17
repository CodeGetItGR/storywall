import { Package } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import type { BillingData } from '@/hooks/useEventBillingPanel';
import { formatMoney } from '@/lib/billing';
import { routes } from '@/lib/routes';

/** The add-ons this event owns, then the one way to change them. */
export function BillingAddonsSection({
    eventId,
    addons,
    currency,
    canManage,
    hasFeatureAddons = false,
}: {
    eventId: string;
    addons: BillingData['addons'];
    currency: string;
    canManage: boolean;
    // Feature add-ons on offer: the link is about more than storage (KAN-82).
    hasFeatureAddons?: boolean;
}) {
    const t = useTranslations('EventPlanSettingsPage.addons');
    const locale = useLocale();

    if (addons.length === 0 && !canManage) return null;

    return (
        <section aria-labelledby="billing-addons-title" className="flex flex-col gap-2.5">
            {/* Heading */}
            <h2 id="billing-addons-title" className="text-base font-bold text-ink">
                {t('manageTitle')}
            </h2>

            {/* Owned add-ons */}
            {addons.length > 0 ? (
                <ul className="flex flex-col gap-2">
                    {addons.map((addon, index) => (
                        <li
                            key={`${addon.code}-${addon.activatedAt}-${index}`}
                            className="flex items-center gap-3 rounded-[16px] bg-surface-muted px-3.5 py-3 text-sm font-semibold text-ink"
                        >
                            <Package className="h-[19px] w-[19px] shrink-0 text-primary-dark" aria-hidden="true" />
                            {/* On a gift event, an add-on another host paid has no price */}
                            <span className="min-w-0 flex-1">
                                {addon.priceAmountMinor === null
                                    ? t('itemGift', { name: addon.name })
                                    : t(addon.billingPeriod === 'ONE_TIME' ? 'itemOnce' : 'item', {
                                          name: addon.name,
                                          price: formatMoney(locale, addon.priceAmountMinor, currency),
                                      })}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            )}

            {/* Action */}
            {canManage && (
                <div className="flex">
                    <AppLink
                        href={routes.events.settingsAddons(eventId)}
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-[18px] text-sm font-bold whitespace-nowrap text-primary-dark shadow-[inset_0_0_0_1.5px_#f2c2b2]"
                    >
                        {t(addons.length > 0 || hasFeatureAddons ? 'manageAction' : 'addStorage')}
                    </AppLink>
                </div>
            )}
        </section>
    );
}
