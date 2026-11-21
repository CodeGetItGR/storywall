import { getTranslations } from 'next-intl/server';

import { HeroView } from '@/components/occasions/sections/hero/HeroView';
import { heroViewProps } from '@/components/occasions/sections/hero/heroViewProps';
import { heroVisual } from '@/components/occasions/sections/hero/heroVisual';
import type { Locale } from '@/i18n/config';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import { type Occasion, occasionAlternatePaths } from '@/lib/occasions/occasions';
import type { OccasionPageMedia } from '@/lib/occasions/pageMedia';

type HeroSectionProps = {
    campaign: OccasionCampaign | null;
    createHref: string;
    // null: no demo; the second button goes to the themes, or there is none.
    demoHref: string | null;
    locale: Locale;
    media: OccasionPageMedia;
    occasion: Occasion;
    price: OccasionPriceValues;
    // The QR wedding page while it is live and the page links to it, else null.
    qrHref: string | null;
    // "#themes" while the page shows its Themes section, else null.
    themesHref: string | null;
};

export async function HeroSection({ campaign, createHref, demoHref, locale, media, occasion, price, qrHref, themesHref }: HeroSectionProps) {
    const page = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage' });
    // A campaign may swap the body and the CTA label. The h1 always stays the keyword.
    const campaignCopy = campaign?.hero ? await getTranslations({ locale, namespace: `OccasionPages.campaigns.${campaign.id}` }) : null;

    return (
        <HeroView
            {...heroViewProps({
                alternatePaths: occasionAlternatePaths(occasion),
                campaign: campaignCopy,
                common,
                createHref,
                demoHref,
                landing,
                locale,
                page,
                price,
                qrHref,
                themesHref,
                visual: media.hero ? heroVisual(media.hero, page('hero.feedAlt')) : {},
            })}
        />
    );
}
