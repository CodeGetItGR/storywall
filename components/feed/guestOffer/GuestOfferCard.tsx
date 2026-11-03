'use client';

import { ArrowUpRight, Loader2, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Logo } from '@/components/common/Logo';
import { GuestOfferCode } from '@/components/feed/guestOffer/GuestOfferCode';
import { CampaignCountdown } from '@/components/siteNotices/CampaignCountdown';
import { useGuestOffer } from '@/hooks/useGuestOffer';
import { useLiveDiscountCampaign } from '@/hooks/useLiveDiscountCampaign';
import type { Locale } from '@/i18n/config';
import { numberFormat } from '@/lib/format';
import { guestOfferLandingHref, guestOfferPlansHref } from '@/lib/guestOffer';

const BRAND_GRADIENT = 'bg-[linear-gradient(132deg,#C777B1_20%,#E48279_43%,#F2885C_54%,#FEC463_99%)]';

// Pinned above the posts for guests: discover Storywall, or get a discount on an event of their own.
// Display only: no reactions, comments or menu.
export function GuestOfferCard({ eventId, isHost }: { eventId: string; isHost: boolean }) {
    const t = useTranslations('GuestOffer');
    const tNotice = useTranslations('SiteNotice');
    const locale = useLocale() as Locale;
    const campaign = useLiveDiscountCampaign();
    const { offer, claimCode, isClaiming, claimFailed, close, copyCode, isCopied, markDiscovered, seenRef } = useGuestOffer(eventId, isHost);
    if (!offer) return null;

    // A code the guest already holds stays; otherwise the campaign takes the claim's place.
    const liveCampaign = offer.code ? null : campaign;

    const discoverLink = (
        <a
            href={guestOfferLandingHref(locale)}
            target="_blank"
            rel="noopener"
            onClick={markDiscovered}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white/55 px-5 text-sm font-medium text-ink ring-1 ring-[#d69696]/35 transition-colors ring-inset hover:bg-white/80"
        >
            {t('discover')}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </a>
    );

    return (
        <article className="border-b border-event-card-line px-2 py-4">
            <div
                ref={seenRef}
                className="@container relative isolate overflow-hidden rounded-[1.25rem] bg-linear-to-b from-[#fbdde6] via-[#fce3e3] to-[#fde8d6] p-5 shadow-[0_18px_40px_-28px_rgba(36,31,26,0.25)]"
            >
                <span className={`absolute inset-x-0 top-0 h-1 ${BRAND_GRADIENT}`} aria-hidden="true" />

                {/* Header */}
                <div className="flex items-center justify-between">
                    <Logo className="gap-2" iconClassName="h-6 w-auto" wordmarkClassName="h-4 w-auto" />
                    <button
                        type="button"
                        onClick={close}
                        aria-label={t('close')}
                        className="-mr-1.5 inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white/50 hover:text-ink"
                    >
                        <X className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                    </button>
                </div>

                <div className="@lg:grid @lg:grid-cols-[1fr_auto] @lg:items-center @lg:gap-8">
                    {/* Message */}
                    <div className="mt-4">
                        <h2 className="text-xl leading-snug font-semibold text-ink">{t('title')}</h2>
                        <p className="mt-1.5 max-w-[34ch] text-[0.9375rem] leading-relaxed text-ink-muted">
                            {liveCampaign ? (
                                <>
                                    {tNotice('campaign', { percent: numberFormat(locale).format(liveCampaign.percent) })}{' '}
                                    <CampaignCountdown endsAt={liveCampaign.endsAt} />
                                </>
                            ) : (
                                t('line')
                            )}
                        </p>
                    </div>

                    {/* Actions */}
                    {liveCampaign ? (
                        <div className="mt-5 flex flex-wrap gap-2.5 @lg:flex-col @lg:items-stretch">
                            <a
                                href={guestOfferPlansHref(locale)}
                                target="_blank"
                                rel="noopener"
                                onClick={markDiscovered}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                            >
                                {tNotice('seePlans')}
                                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                            </a>
                        </div>
                    ) : offer.code ? (
                        <div className="mt-5 flex flex-col items-start gap-3.5 @lg:w-72 @lg:items-stretch">
                            <GuestOfferCode code={offer.code} endsAt={offer.endsAt} isCopied={isCopied} onCopy={copyCode} />
                            {discoverLink}
                        </div>
                    ) : (
                        <div className="mt-5 flex flex-wrap gap-2.5 @lg:flex-col @lg:items-stretch">
                            <button
                                type="button"
                                onClick={claimCode}
                                disabled={isClaiming}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-70"
                            >
                                {isClaiming && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {t.rich('claim', {
                                    percent: offer.discountPercent,
                                    pct: (chunks) => (
                                        <span className={`${BRAND_GRADIENT} bg-clip-text text-transparent brightness-125`}>{chunks}</span>
                                    ),
                                })}
                            </button>
                            {discoverLink}
                        </div>
                    )}
                </div>

                {claimFailed && (
                    <p role="alert" className="mt-3 text-sm text-red-600">
                        {t('claimFailed')}
                    </p>
                )}
            </div>
        </article>
    );
}
