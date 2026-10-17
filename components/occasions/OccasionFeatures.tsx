import { getTranslations } from 'next-intl/server';

import { LandingFeatureDetailCard } from '@/components/landing/LandingFeatureDetailCard';
import type { Locale } from '@/i18n/config';
import { landingSectionAttributes } from '@/lib/landingTracking';
import { occasionFeatureImage } from '@/lib/occasions/occasionMedia';
import type { Occasion } from '@/lib/occasions/occasions';
import { OCCASION_SECTION_IDS } from '@/lib/occasions/occasionSections';

type OccasionFeaturesProps = { featureKeys: string[]; locale: Locale; occasion: Occasion };

const IMAGE_POSITION = { top: 'object-top', bottom: 'object-bottom' } as const;

// The landing's dark feature cards, one per feature this occasion's plans include.
export async function OccasionFeatures({ featureKeys, locale, occasion }: OccasionFeaturesProps) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    // The occasion's own words, else the generic line. A module with neither is left out.
    const features = featureKeys.flatMap((key) => {
        const copy = t.has(`features.${key}.title`) ? t : common.has(`features.${key}.title`) ? common : null;
        if (!copy) return [];
        const image = occasionFeatureImage(occasion.eventType, key);
        return [{ key, image, title: copy(`features.${key}.title`), description: copy(`features.${key}.body`) }];
    });

    return (
        <section
            aria-labelledby="occasion-features-title"
            className="bg-[radial-gradient(circle_at_15%_8%,rgba(150,48,118,0.18),transparent_38%),linear-gradient(180deg,#171419_0%,#101014_56%,#0b0b0f_100%)] py-14 text-white min-[761px]:px-[5vw] min-[761px]:py-20"
            id={OCCASION_SECTION_IDS.features}
            {...landingSectionAttributes('features')}
        >
            {/* Eyebrow + heading */}
            <div className="px-5 min-[761px]:mx-auto min-[761px]:max-w-170 min-[761px]:px-0 min-[761px]:text-center">
                <p className="m-0 text-[13px] font-black tracking-[0.15em] text-[#f2c66a] uppercase">{t('featuresIntro.eyebrow')}</p>
                <h2
                    className="mt-4 mb-0 [font-family:var(--editorial)] text-[clamp(40px,10vw,56px)] leading-[0.95] font-normal tracking-[-0.045em] min-[761px]:text-[clamp(44px,4vw,64px)]"
                    id="occasion-features-title"
                >
                    {t('featuresIntro.heading')}
                </h2>
            </div>

            {/* Feature cards: a swipeable row on phones, a grid from 761px */}
            <ul className="mt-10 no-scrollbar flex snap-x snap-mandatory scroll-px-5 list-none gap-4 overflow-x-auto px-5 pb-2 min-[761px]:mx-auto min-[761px]:mt-12 min-[761px]:grid min-[761px]:max-w-340 min-[761px]:grid-cols-2 min-[761px]:gap-5 min-[761px]:overflow-visible min-[761px]:px-0 min-[1024px]:grid-cols-4">
                {features.map((feature) => (
                    <li className="w-[78vw] max-w-80 shrink-0 snap-start min-[761px]:w-auto min-[761px]:max-w-none" key={feature.key}>
                        <LandingFeatureDetailCard
                            description={feature.description}
                            imageAlt=""
                            imagePath={feature.image.src}
                            objectPosition={feature.image.position ? IMAGE_POSITION[feature.image.position] : undefined}
                            title={feature.title}
                        />
                    </li>
                ))}
            </ul>
        </section>
    );
}
