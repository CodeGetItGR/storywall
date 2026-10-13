import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { OccasionCtaLink } from '@/components/occasions/OccasionCtaLink';
import type { Locale } from '@/i18n/config';
import type { LandingImageAsset } from '@/lib/landingMedia';
import type { Occasion } from '@/lib/occasions/occasions';

type OccasionFinalCtaProps = {
    alternatePaths: Record<Locale, string>;
    createHref: string;
    image: LandingImageAsset | null;
    locale: Locale;
    occasion: Occasion;
};

export async function OccasionFinalCta({ alternatePaths, createHref, image, locale, occasion }: OccasionFinalCtaProps) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.finalCta` });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });

    return (
        <section className="bg-[var(--occasion-tint)] min-[761px]:grid min-[761px]:grid-cols-[1fr_1fr] min-[761px]:items-stretch">
            {/* Photo */}
            {image ? (
                <div className="relative aspect-[4/3] min-[761px]:aspect-auto min-[761px]:min-h-150">
                    <Image fill alt={t('imageAlt')} className="object-cover" sizes="(min-width: 761px) 50vw, 100vw" src={image.src} />
                </div>
            ) : null}

            {/* Copy */}
            <div className="occasion-reveal flex flex-col justify-center px-5 py-14 min-[761px]:px-[6vw] min-[761px]:py-24">
                <h2 className="m-0 max-w-[14ch] [font-family:var(--editorial)] text-[clamp(40px,11vw,56px)] leading-[1] font-normal tracking-[-0.035em] text-balance min-[761px]:text-[clamp(52px,5vw,76px)]">
                    {t('heading')}
                </h2>
                <p className="mt-5 mb-0 max-w-120 text-base leading-[1.6] text-pretty text-[#3d3836]">{t('body')}</p>
                <div>
                    <OccasionCtaLink className="mt-8" href={createHref}>
                        {common('finalCta')}
                    </OccasionCtaLink>
                </div>
                {/* Language (mobile) */}
                <div className="mt-8 min-[761px]:hidden">
                    <LanguageSwitcher alternatePaths={alternatePaths} />
                </div>
            </div>
        </section>
    );
}
