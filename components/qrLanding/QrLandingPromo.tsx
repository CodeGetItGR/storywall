'use client';

import { useLocale, useTranslations } from 'next-intl';

import { CampaignCountdown } from '@/components/siteNotices/CampaignCountdown';
import { useLiveDiscountCampaign } from '@/hooks/useLiveDiscountCampaign';
import type { Locale } from '@/i18n/config';
import { numberFormat } from '@/lib/format';
import { qrPromoHref } from '@/lib/qrLanding';

const TITLE_CLASS = 'font-editorial text-[21px] leading-snug text-ink';
const LINK_CLASS = 'mt-3 inline-block text-sm font-semibold text-ink underline underline-offset-4 hover:opacity-80';

// At the foot of the QR choice page (KAN-208): the live discount with its countdown, or, with none,
// a short invitation to make a Storywall of their own. Both open the home page in a new tab.
export function QrLandingPromo() {
    const t = useTranslations('GuestOffer');
    const locale = useLocale() as Locale;
    const campaign = useLiveDiscountCampaign();
    const link = (
        <a href={qrPromoHref(locale)} target="_blank" rel="noopener" className={LINK_CLASS}>
            {t('discover')}
        </a>
    );

    return (
        <section className="border-t border-border pt-7 text-center">
            {campaign ? (
                <>
                    {/* Discount */}
                    <p className="text-gradient-brand font-editorial text-[64px] leading-none tracking-tight">
                        {t('percentOff', { percent: numberFormat(locale).format(campaign.percent) })}
                    </p>
                    <p className="mt-2 text-[13px] text-ink-muted">
                        <CampaignCountdown endsAt={campaign.endsAt} />
                    </p>
                    <h2 className={`mt-2 ${TITLE_CLASS}`}>{t('title')}</h2>
                    {link}
                </>
            ) : (
                <>
                    {/* Teaser */}
                    <h2 className={TITLE_CLASS}>{t('title')}</h2>
                    <p className="mt-1.5 text-[13px] text-ink-muted">{t('line')}</p>
                    {link}
                </>
            )}
        </section>
    );
}
