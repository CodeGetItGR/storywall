import { getTranslations } from 'next-intl/server';

import { GradientIcon } from '@/components/occasions/wedding/mock/GradientIcon';
import { WeddingSectionHead } from '@/components/occasions/wedding/WeddingSectionHead';
import { WeddingWrap } from '@/components/occasions/wedding/WeddingWrap';
import type { Locale } from '@/i18n/config';
import { landingSectionAttributes } from '@/lib/landingTracking';
import { OCCASION_SECTION_IDS } from '@/lib/occasions/occasionSections';
import { weddingFeatures } from '@/lib/occasions/weddingFeatures';

type WeddingFeaturesProps = {
    // What the wedding plans offer (occasionFeatureKeys), so a module that is off is never advertised.
    featureKeys: string[];
    locale: Locale;
};

// Everything the wedding website does, on the dark band: five per row from 1101 px, two below.
export async function WeddingFeatures({ featureKeys, locale }: WeddingFeaturesProps) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.WEDDING' });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    // The wedding's own words, else the shared line. A feature with neither is left out.
    const features = weddingFeatures(featureKeys).flatMap((feature) => {
        const copy = t.has(`features.${feature.key}.title`) ? t : common.has(`features.${feature.key}.title`) ? common : null;
        if (!copy) return [];
        return [{ ...feature, title: copy(`features.${feature.key}.title`), body: copy(`features.${feature.key}.body`) }];
    });

    return (
        <section
            aria-labelledby="wedding-features-title"
            className="bg-[#342525] bg-[radial-gradient(ellipse_at_14%_12%,rgba(174,78,67,0.3)_0%,transparent_44%),radial-gradient(ellipse_at_88%_78%,rgba(189,113,65,0.21)_0%,transparent_47%),linear-gradient(125deg,#3b2529_0%,#2e2328_42%,#302523_72%,#402a26_100%)] pt-17.5 pb-15.5 font-[Arial,Helvetica,sans-serif] text-white min-[601px]:pt-[clamp(75px,7vw,110px)] min-[601px]:pb-16.25 min-[761px]:pb-[clamp(70px,7vw,110px)]"
            id={OCCASION_SECTION_IDS.features}
            {...landingSectionAttributes('features')}
        >
            <WeddingWrap>
                {/* Heading */}
                <WeddingSectionHead
                    className="mb-9 max-w-250 min-[761px]:mb-14"
                    heading={t.raw('featuresHead.heading') as [string, string]}
                    headingClassName="text-[clamp(36px,9vw,46px)] leading-[1.05] tracking-[-0.05em] min-[768px]:text-[clamp(40px,4.6vw,76px)] min-[768px]:leading-[0.95]"
                    id="wedding-features-title"
                    kicker={t('featuresHead.kicker')}
                    kickerClassName="text-[#ffca52]"
                    stacked={false}
                />
                {/* Features */}
                <ul className="m-0 grid list-none grid-cols-2 gap-x-4.5 gap-y-8.5 p-0 min-[768px]:gap-x-5.5 min-[768px]:gap-y-7.5 min-[901px]:gap-x-[clamp(18px,2.2vw,34px)] min-[901px]:gap-y-[clamp(22px,3vw,44px)] min-[1101px]:grid-cols-5">
                    {features.map((feature) => (
                        <li className="min-w-0" key={feature.key}>
                            <span className="mb-3.75 block w-fit drop-shadow-[0_4px_8px_rgba(230,126,105,0.14)] min-[768px]:mb-4.5">
                                <GradientIcon className="size-12 min-[768px]:size-15.5" src={feature.icon} />
                            </span>
                            <h3 className="mt-0 mb-2 [font-family:var(--editorial)] text-[clamp(17px,4.7vw,22px)] leading-[1.12] font-normal tracking-[-0.03em] min-[768px]:text-[23px] min-[768px]:leading-[1.05]">
                                {feature.title}
                            </h3>
                            <p className="m-0 text-[clamp(12px,3.25vw,14px)] leading-[1.48] text-white/66 min-[768px]:text-[14px] min-[768px]:leading-[1.5]">
                                {feature.body}
                            </p>
                        </li>
                    ))}
                </ul>
            </WeddingWrap>
        </section>
    );
}
