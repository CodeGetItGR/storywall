import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { GiftAccountSetup } from '@/components/manage/GiftAccountSetup';
import type { EventBillingResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { routes } from '@/lib/routes';

export function OverviewDraftPanel({
    eventId,
    canPay,
    currency,
    selectedAddons,
    activationTotal,
    wishlistAvailable,
}: {
    eventId: string;
    canPay: boolean;
    currency: string;
    selectedAddons: EventBillingResponseDto['addons'];
    activationTotal: number | null;
    wishlistAvailable: boolean;
}) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();

    return (
        <div className="border-l-2 border-primary pl-3">
            {/* Intro */}
            <p className="text-sm font-bold text-ink">{t('draft.title')}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('draft.body')}</p>

            {/* Selected add-ons */}
            {selectedAddons.length > 0 && (
                <div className="mt-3 border-t border-border/70 pt-3">
                    <p className="text-xs font-semibold text-ink">{t('draft.selectedAddons.title')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('draft.selectedAddons.body')}</p>
                    <ul className="mt-2 space-y-1.5">
                        {selectedAddons.map((addon, index) => (
                            <li key={`${addon.code}-${index}`} className="flex items-center justify-between gap-3 text-xs text-ink-muted">
                                <span className="truncate font-semibold text-ink">{addon.name}</span>
                                <span className="shrink-0">
                                    {formatMoney(locale, addon.priceAmountMinor, currency)} {t('draftModules.once')}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Gift account */}
            {wishlistAvailable && <GiftAccountSetup eventId={eventId} />}

            {/* Activation */}
            {activationTotal !== null && (
                <p className="mt-3 text-xs font-semibold text-ink">
                    {t('draft.activationTotal', { total: formatMoney(locale, activationTotal, currency) })}
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
    );
}
