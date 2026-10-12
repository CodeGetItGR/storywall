import { getTranslations } from 'next-intl/server';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';

type OccasionFinalCtaProps = { alternatePaths: Record<Locale, string>; createHref: string; locale: Locale; occasion: Occasion };

export async function OccasionFinalCta({ alternatePaths, createHref, locale, occasion }: OccasionFinalCtaProps) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.finalCta` });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });

    return (
        <section className="bg-[linear-gradient(135deg,#ffc969_0%,#f9a462_48%,#f39a72_100%)] px-5 py-14 min-[761px]:px-[7vw] min-[761px]:py-24">
            <h2 className="m-0 [font-family:var(--editorial)] text-[clamp(40px,11vw,56px)] leading-[0.9] font-normal tracking-[-0.05em] min-[761px]:text-[88px]">
                {t('heading')}
            </h2>
            <p className="mt-4 max-w-140 text-base leading-[1.55]">{t('body')}</p>
            <a
                className="mt-7 inline-flex min-h-14 items-center rounded-full bg-white px-6 text-xs font-black tracking-[0.08em] text-[#151313] uppercase no-underline"
                href={createHref}
            >
                {common('finalCta')}
            </a>
            {/* Language (mobile) */}
            <div className="mt-8 min-[761px]:hidden">
                <LanguageSwitcher alternatePaths={alternatePaths} />
            </div>
        </section>
    );
}
