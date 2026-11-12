'use client';

import { ArrowRight, Loader2, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Logo } from '@/components/common/Logo';
import { GuestOfferCode } from '@/components/feed/guestOffer/GuestOfferCode';
import { GuestOfferTicket } from '@/components/feed/guestOffer/GuestOfferTicket';
import { CampaignCountdown } from '@/components/siteNotices/CampaignCountdown';
import { AppLink } from '@/components/ui/AppLink';
import { useGuestOffer } from '@/hooks/useGuestOffer';
import { useLiveDiscountCampaign } from '@/hooks/useLiveDiscountCampaign';
import type { Locale } from '@/i18n/config';
import { numberFormat } from '@/lib/format';
import { guestOfferCreateHref, guestOfferLandingHref, guestOfferView } from '@/lib/guestOffer';

const BUTTON = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap';
const PRIMARY_BUTTON = `${BUTTON} bg-ink text-white transition-opacity hover:opacity-90 disabled:opacity-70`;

// Pinned above the posts for guests: discover Storywall, or get a discount and start an event of their own.
// Display only: no reactions, comments or menu.
export function GuestOfferCard({ eventId, isHost }: { eventId: string; isHost: boolean }) {
    const t = useTranslations('GuestOffer');
    const tNotice = useTranslations('SiteNotice');
    const locale = useLocale() as Locale;
    const campaign = useLiveDiscountCampaign();
    const { offer, claimCode, isClaiming, claimFailed, close, copyCode, isCopied, markDiscovered, seenRef } = useGuestOffer(eventId, isHost);
    if (!offer) return null;

    const { mode, percent, campaignEndsAt } = guestOfferView(offer, campaign);

    return (
        <article className="border-b border-event-card-line px-2 py-4">
            <div
                ref={seenRef}
                className="relative isolate overflow-hidden rounded-[1.25rem] bg-linear-to-br from-[#fbdde6] via-[#fce3e3] to-[#fde8d6] p-4 shadow-[0_18px_40px_-28px_rgba(36,31,26,0.25)]"
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Logo className="gap-2" iconClassName="h-5 w-auto" wordmarkClassName="h-3.5 w-auto" />
                    <button
                        type="button"
                        onClick={close}
                        aria-label={t('close')}
                        className="-my-1.5 -mr-1.5 inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-white/50 hover:text-ink"
                    >
                        <X className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                    </button>
                </div>

                {/* Title: the full width, so it stays on one line */}
                <h2 className="mt-2.5 text-lg leading-snug font-semibold text-ink">{t('title')}</h2>

                {/* Line and ticket */}
                <div className="-mb-1.5 flex items-center gap-3">
                    <p className="min-w-0 flex-1 text-sm leading-snug text-ink-muted">
                        {campaignEndsAt ? (
                            <>
                                {t('onAllPlans')} · <CampaignCountdown endsAt={campaignEndsAt} />
                            </>
                        ) : (
                            t('line')
                        )}
                    </p>
                    <GuestOfferTicket label={percent === null ? null : t('percentOff', { percent: numberFormat(locale).format(percent) })} />
                </div>

                {/* Code */}
                {offer.code && (
                    <div className="mt-3">
                        <GuestOfferCode code={offer.code} endsAt={offer.endsAt} isCopied={isCopied} onCopy={copyCode} />
                    </div>
                )}

                {/* Actions */}
                <div className="mt-3.5 flex items-center gap-2">
                    {mode === 'claim' ? (
                        <button type="button" onClick={claimCode} disabled={isClaiming} className={PRIMARY_BUTTON}>
                            {isClaiming && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {t('claim')}
                        </button>
                    ) : (
                        <AppLink href={guestOfferCreateHref(offer.code)} onClick={markDiscovered} className={PRIMARY_BUTTON}>
                            {tNotice('getStarted')}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </AppLink>
                    )}
                    <a
                        href={guestOfferLandingHref(locale)}
                        target="_blank"
                        rel="noopener"
                        onClick={markDiscovered}
                        className={`${BUTTON} bg-white/70 text-ink ring-1 ring-[#d69696]/30 transition-colors ring-inset hover:bg-white`}
                    >
                        {t('discover')}
                    </a>
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
