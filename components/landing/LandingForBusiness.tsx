import { getLocale, getTranslations } from 'next-intl/server';

import { GradientIconDefs } from '@/components/vendorPages/GradientIcon';
import { VendorTypeLinks } from '@/components/vendorPages/VendorPageLinks';
import { GRADIENT_TEXT } from '@/components/vendorPages/vendorPageStyles';
import type { Locale } from '@/i18n/config';
import { getForBusinessPath } from '@/i18n/publicLocale';
import { LANDING_TOKENS_CLASS } from '@/lib/landingTokens';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

// Points professionals to their vendor page. Hidden wherever the vendor pages are.
export async function LandingForBusiness() {
    if (!showsUnreleasedPages()) return null;
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('LandingPage.forBusiness');

    return (
        /* For businesses */
        <section
            aria-labelledby="landing-business-title"
            className={`${LANDING_TOKENS_CLASS} bg-[#f4f0e8] px-5 py-16 text-[#151313] min-[761px]:px-[clamp(24px,4vw,72px)] min-[761px]:py-24`}
            id="for-business"
        >
            <GradientIconDefs />
            <div className="mx-auto max-w-200 text-center">
                {/* Heading */}
                <p className="m-0 mb-3.5 text-[13px] font-black tracking-[.15em] uppercase">{t('eyebrow')}</p>
                <h2
                    className="m-0 mt-6 [font-family:var(--editorial)] text-[clamp(40px,11vw,58px)] leading-[.95] font-normal tracking-[-.05em] text-balance min-[761px]:mt-0 min-[761px]:text-[clamp(44px,4.4vw,68px)]"
                    id="landing-business-title"
                >
                    {t('heading.plain')} <span className={GRADIENT_TEXT}>{t('heading.grad')}</span>
                </h2>
                <p className="mx-auto mt-5 max-w-140 text-sm leading-[1.55] min-[761px]:mt-6 min-[761px]:text-base">{t('body')}</p>
                {/* Vendor pages */}
                <VendorTypeLinks className="mt-9 justify-center" />
                <p className="m-0 mt-8">
                    <a href={getForBusinessPath(locale)} className="text-sm font-semibold text-[#151313] underline underline-offset-4 hover:opacity-70">
                        {t('all')}
                    </a>
                </p>
            </div>
        </section>
    );
}
