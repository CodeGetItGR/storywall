import { getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';

import type { Locale } from '@/i18n/config';
import { landingSectionAttributes } from '@/lib/landingTracking';
import { occasionFeatureIcon } from '@/lib/occasions/occasionFeatures';
import type { Occasion } from '@/lib/occasions/occasions';
import { OCCASION_SECTION_IDS } from '@/lib/occasions/occasionSections';

type OccasionFeaturesProps = { featureKeys: string[]; locale: Locale; occasion: Occasion };

// Every feature this occasion's plans include, as a compact icon list.
export async function OccasionFeatures({ featureKeys, locale, occasion }: OccasionFeaturesProps) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    // The occasion's own words, else the generic line. A module with neither is left out.
    const features = featureKeys.flatMap((key) => {
        const copy = t.has(`features.${key}.title`) ? t : common.has(`features.${key}.title`) ? common : null;
        if (!copy) return [];
        return [{ key, icon: occasionFeatureIcon(key), title: copy(`features.${key}.title`), description: copy(`features.${key}.body`) }];
    });

    return (
        <section
            aria-labelledby="occasion-features-title"
            className="bg-[radial-gradient(circle_at_15%_8%,rgba(150,48,118,0.18),transparent_38%),linear-gradient(180deg,#171419_0%,#101014_56%,#0b0b0f_100%)] px-5 py-16 text-white min-[761px]:px-[5vw] min-[761px]:py-24"
            id={OCCASION_SECTION_IDS.features}
            {...landingSectionAttributes('features')}
        >
            {/* Heading */}
            <div className="min-[761px]:mx-auto min-[761px]:max-w-170 min-[761px]:text-center">
                <h2
                    className="m-0 [font-family:var(--editorial)] text-[clamp(40px,10vw,56px)] leading-[0.95] font-normal tracking-[-0.045em] text-balance min-[761px]:text-[clamp(44px,4vw,64px)]"
                    id="occasion-features-title"
                >
                    {t('featuresIntro.heading')}
                </h2>
            </div>

            {/* Features */}
            <ul className="mx-auto mt-11 grid max-w-290 list-none gap-x-12 gap-y-8 p-0 min-[761px]:mt-16 min-[761px]:grid-cols-2 min-[761px]:gap-y-12 min-[1024px]:grid-cols-3">
                {features.map((feature) => (
                    <li className="flex items-start gap-4" key={feature.key}>
                        <span
                            aria-hidden="true"
                            className="block size-11 shrink-0 bg-[linear-gradient(135deg,#f89ab0_0%,#f6a18f_34%,#f4b37b_68%,#f3cf8a_100%)] [mask-image:var(--icon)] [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat] [-webkit-mask-image:var(--icon)] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain] min-[761px]:size-12"
                            style={{ '--icon': `url('${feature.icon}')` } as CSSProperties}
                        />
                        <div className="min-w-0">
                            <h3 className="m-0 [font-family:var(--editorial)] text-[24px] leading-[1.05] font-normal tracking-[-0.03em] min-[761px]:text-[26px]">
                                {feature.title}
                            </h3>
                            <p className="mt-2 mb-0 text-[15px] leading-[1.5] text-white/72">{feature.description}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
