import { getTranslations } from 'next-intl/server';

import { OccasionFeatureExplorer, type OccasionFeatureItem } from '@/components/occasions/OccasionFeatureExplorer';
import { OccasionSectionHeading } from '@/components/occasions/OccasionSectionHeading';
import type { Locale } from '@/i18n/config';
import { occasionFeatureImage } from '@/lib/occasions/occasionMedia';
import type { Occasion } from '@/lib/occasions/occasions';

type OccasionFeaturesProps = { featureKeys: string[]; locale: Locale; occasion: Occasion };

export async function OccasionFeatures({ featureKeys, locale, occasion }: OccasionFeaturesProps) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    // The occasion's own words, else the generic line. A module with neither is left out.
    const features = featureKeys.flatMap<OccasionFeatureItem>((key) => {
        const image = occasionFeatureImage(occasion.eventType, key);
        if (t.has(`features.${key}.title`)) return [{ key, image, title: t(`features.${key}.title`), body: t(`features.${key}.body`) }];
        if (common.has(`features.${key}.title`)) return [{ key, image, title: common(`features.${key}.title`), body: common(`features.${key}.body`) }];
        return [];
    });

    return (
        <section className="occasion-dark px-5 py-14 text-white min-[761px]:px-[5vw] min-[761px]:py-24">
            {/* Heading */}
            <OccasionSectionHeading>{common('featuresHeading')}</OccasionSectionHeading>

            {/* Features */}
            <OccasionFeatureExplorer features={features} />
        </section>
    );
}
