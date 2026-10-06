'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { useStoragePurchasePaused } from '@/hooks/useBillingWithdrawals';
import type { PurchaseBlock } from '@/hooks/usePurchaseBlock';
import { useStoragePackSelection } from '@/hooks/useStoragePackSelection';
import { useEventUsage } from '@/hooks/useUsage';
import type { PaidServiceResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { formatBytes } from '@/lib/format';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const BUY_CLASS_NAME =
    'mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto lg:w-full';

// The landing plan card's look (tracked title, underlined picks, gradient serif price, ✓ line).
export function StoragePackPurchase({
    eventId,
    services,
    purchaseBlock,
}: {
    eventId: string;
    services: PaidServiceResponseDto[];
    // Co-hosts and demo visitors see the offer with buying disabled.
    purchaseBlock: PurchaseBlock | null;
}) {
    const t = useTranslations('EventPlanSettingsPage.storagePacks');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const canPurchase = purchaseBlock === null;
    const usage = useEventUsage(eventId);
    const { selectedService, handleSelect } = useStoragePackSelection(services);
    // A whole-event withdrawal under review pauses pack purchases.
    const paused = useStoragePurchasePaused(eventId, canPurchase);

    if (services.length === 0) return null;

    const currentLimit = usage.data ? (usage.data.storageLimitBytes ?? usage.data.planStorageBytes) : null;
    const newTotal =
        currentLimit !== null && selectedService?.grantsStorageBytes ? formatBytes(currentLimit + selectedService.grantsStorageBytes) : null;
    const priceLabel = selectedService ? formatMoney(locale, selectedService.priceAmountMinor, selectedService.priceCurrency) : '';

    return (
        <section className="lg:grid lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-12">
            {/* Title and current space */}
            <div>
                <h2 className="text-xl leading-tight font-black tracking-[.09em] text-ink uppercase">{t('title')}</h2>
                <p className="mt-1 text-sm text-ink-muted">{t('subtitle')}</p>
                {usage.data && (
                    <p className="mt-1 text-sm text-ink-muted">
                        {usage.data.planStorageBytes === null
                            ? t('unlimited')
                            : t('breakdown', {
                                  plan: formatBytes(usage.data.planStorageBytes),
                                  extra: formatBytes(usage.data.extraStorageBytes),
                                  total: formatBytes(usage.data.storageLimitBytes ?? usage.data.planStorageBytes),
                              })}
                    </p>
                )}

                {/* Why buying is disabled */}
                {purchaseBlock && <p className="mt-3 text-xs text-ink-muted">{tCommon(purchaseBlock === 'demo' ? 'demoPurchaseDisabled' : 'primaryHostOnly')}</p>}

                {/* Paused while a withdrawal is under review */}
                {paused && <p className="mt-3 text-xs text-ink-muted">{t('paused')}</p>}
            </div>

            {/* Purchase: framed like the landing's featured plan on wide screens */}
            <div className="lg:rounded-[22px] lg:border lg:border-[#f29380] lg:px-6 lg:pt-3 lg:pb-6">
                {/* Packs */}
                <div className="mt-4 flex flex-wrap gap-5" role="radiogroup" aria-label={t('selectorLabel')}>
                    {services.map((service) => {
                        const isSelected = selectedService?.code === service.code;
                        return (
                            <button
                                key={service.id}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                data-service-code={service.code}
                                onClick={handleSelect}
                                className={cn(
                                    'relative min-h-11 text-sm before:absolute before:inset-x-0 before:bottom-1.5 before:h-0.75 before:rounded-full',
                                    isSelected
                                        ? 'font-bold text-ink before:bg-[linear-gradient(90deg,#df7794,#f2c764)]'
                                        : 'font-medium text-ink-muted hover:text-ink',
                                )}
                            >
                                +{service.grantsStorageBytes ? formatBytes(service.grantsStorageBytes) : service.name}
                            </button>
                        );
                    })}
                </div>

                {/* Price and result */}
                {selectedService && (
                    <>
                        <p className="mt-2 flex items-baseline gap-2">
                            <span className="bg-[linear-gradient(110deg,#d889a0,#e98778_28%,#f39a63_58%,#f5b967)] bg-clip-text pr-[.06em] font-[Baskerville,Georgia,serif] text-[48px] leading-[1.1] tracking-[-.06em] text-transparent tabular-nums">
                                {priceLabel}
                            </span>
                            <span className="text-sm text-ink-muted">{t('once')}</span>
                        </p>
                        {newTotal && (
                            <p className="relative mt-2 border-b border-ink/10 py-2.5 pl-6 text-sm text-ink before:absolute before:top-2.5 before:left-0 before:content-['✓']">
                                {t('newTotal', { total: newTotal })}
                            </p>
                        )}

                        {/* Buy */}
                        {paused ? null : canPurchase ? (
                            <Link href={routes.events.checkoutReview(eventId, 'storage', { code: selectedService.code })} className={BUY_CLASS_NAME}>
                                {t('buy', { amount: priceLabel })}
                            </Link>
                        ) : (
                            <span role="link" aria-disabled="true" className={cn(BUY_CLASS_NAME, 'cursor-not-allowed opacity-40')}>
                                {t('buy', { amount: priceLabel })}
                            </span>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
