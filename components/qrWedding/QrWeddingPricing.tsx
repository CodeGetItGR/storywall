import { getTranslations } from 'next-intl/server';

import { QrWeddingPlans } from '@/components/qrWedding/QrWeddingPlans';
import type { Locale } from '@/i18n/config';
import { localizeLegalHref } from '@/i18n/publicLocale';
import { QR_WEDDING_SECTION } from '@/lib/qrWeddingPage';
import { routes } from '@/lib/routes';

const TRUST_ITEM = "max-[761px]:before:hidden before:mx-3 before:content-['·'] first:before:hidden";

// The wedding packages, every one with the QR code, and the payment reassurances under them.
export async function QrWeddingPricing({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.pricing' });

    return (
        <section
            aria-labelledby="qr-wedding-pricing-title"
            className="border-t border-[rgba(21,19,19,.12)] bg-white px-[clamp(22px,5vw,90px)] pt-22 pb-24.5 text-[#151313] max-[781px]:px-5 max-[781px]:pt-17.5 max-[781px]:pb-20 max-[601px]:px-4.25 max-[601px]:pt-16.25 max-[601px]:pb-18.75"
            id={QR_WEDDING_SECTION.pricing}
        >
            {/* Heading */}
            <div className="mx-auto w-full max-w-320 text-center max-[761px]:mb-14.5">
                <div className="mx-auto mb-3.5 font-[Arial,sans-serif] text-[13px] font-black tracking-[0.15em] uppercase max-[761px]:pt-3">
                    {t('kicker')}
                </div>
                <h2
                    className="m-0 [font-family:var(--editorial)] text-[clamp(40.5px,4.275vw,70.5px)] leading-[.9] font-normal tracking-[-0.055em] max-[761px]:mt-6 max-[761px]:text-[clamp(44px,12vw,62px)]"
                    id="qr-wedding-pricing-title"
                >
                    {t('title')}
                </h2>
                <p className="mx-auto mt-6.25 max-w-155 font-[Arial,sans-serif] text-base leading-[1.55] max-[761px]:mt-4.5 max-[761px]:text-sm">
                    {t('body')}
                </p>
            </div>

            {/* Packages */}
            <QrWeddingPlans chooseLabel={t('choose')} durationGroup={t.raw('durationGroup') as string} />

            {/* Payment reassurances */}
            <p className="mx-auto mt-[clamp(26px,3vw,40px)] flex flex-wrap justify-center gap-y-2 px-4 font-[Arial,sans-serif] text-xs leading-[1.4] font-bold tracking-[0.04em] text-[rgba(21,19,19,.7)] max-[761px]:flex-col max-[761px]:items-center">
                <span className={TRUST_ITEM}>{t('secure')}</span>
                <span className={TRUST_ITEM}>
                    {t.rich('refund', {
                        link: (chunks) => (
                            <a className="underline underline-offset-3" href={localizeLegalHref(routes.legal.withdrawalTerms(), locale)}>
                                {chunks}
                            </a>
                        ),
                    })}
                </span>
                <span className={TRUST_ITEM}>
                    <a className="underline underline-offset-3" href={`#${QR_WEDDING_SECTION.demo}`}>
                        {t('demo')}
                    </a>
                </span>
            </p>
        </section>
    );
}
