import type { FeaturesViewProps } from '@/components/occasions/sections/features/FeaturesView';
import type { PageTranslator } from '@/lib/occasions/pageCopy';
import { occasionPageFeatures } from '@/lib/occasions/pageFeatures';

type FeaturesViewPropsInput = {
    // OccasionPages.common
    common: PageTranslator;
    // What the plans offer (occasionFeatureKeys), so a module that is off is never advertised.
    featureKeys: string[];
    // OccasionPages.<type>
    page: PageTranslator;
};

// The occasion's own words per feature, else the shared line. A feature with neither is left out,
// and so are themes: a page that sells them has its own Themes section.
export function featuresViewProps({ common, featureKeys, page }: FeaturesViewPropsInput): FeaturesViewProps {
    const features = occasionPageFeatures(featureKeys.filter((key) => key !== 'theme')).flatMap((feature) => {
        const copy = page.has(`features.${feature.key}.title`) ? page : common.has(`features.${feature.key}.title`) ? common : null;
        if (!copy) return [];
        return [{ ...feature, title: copy(`features.${feature.key}.title`), body: copy(`features.${feature.key}.body`) }];
    });
    return { features, heading: page.raw('featuresHead.heading') as [string, string], kicker: page('featuresHead.kicker') };
}
