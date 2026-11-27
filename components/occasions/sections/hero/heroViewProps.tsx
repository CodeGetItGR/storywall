import type { ReactNode } from 'react';

import type { HeroViewProps } from '@/components/occasions/sections/hero/HeroView';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { occasionHeroSecondary } from '@/lib/landingHero';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import { occasionHeaderLinks } from '@/lib/occasions/occasionSections';
import type { PageTranslator } from '@/lib/occasions/pageCopy';

type HeroViewPropsInput = {
    alternatePaths: Record<Locale, string>;
    // OccasionPages.campaigns.<id> while a campaign swaps the body and CTA, else null.
    campaign: PageTranslator | null;
    // OccasionPages.common
    common: PageTranslator;
    createHref: string;
    demoHref: string | null;
    // LandingPage
    landing: PageTranslator;
    locale: Locale;
    // OccasionPages.<type>
    page: PageTranslator;
    price: OccasionPriceValues;
    qrHref: string | null;
    themesHref: string | null;
    visual: HeroViewProps['visual'];
};

// The hero's copy and links. The h1 always stays the keyword, whatever the campaign.
export function heroViewProps({
    alternatePaths,
    campaign,
    common,
    createHref,
    demoHref,
    landing,
    locale,
    page,
    price,
    qrHref,
    themesHref,
    visual,
}: HeroViewPropsInput): HeroViewProps {
    const nav = landing.raw('hero.nav') as string[];
    const mobileNav = landing.raw('hero.mobileNav') as string[];

    return {
        alternatePaths,
        breadcrumb: { current: page('hero.breadcrumb'), label: common('breadcrumbLabel') },
        header: { links: occasionHeaderLinks(nav, mobileNav, landing('faq.eyebrow')), loginLabel: nav.at(-1)!, mobileLoginLabel: mobileNav.at(-1)! },
        homeHref: getPublicLandingPath(locale),
        kicker: page.rich('hero.kicker', { b: (chunks: ReactNode) => <strong className="font-bold">{chunks}</strong> }),
        title: page.rich('hero.h1', {
            em: (chunks: ReactNode) => (
                <em className="[background-image:var(--brand-gradient)] bg-clip-text text-transparent italic min-[768px]:pr-[0.06em]">{chunks}</em>
            ),
        }),
        subtitle: page('hero.subtitle'),
        // A campaign may swap the body and the CTA label.
        body: campaign ? campaign('lead') : page('hero.body'),
        actions: {
            createHref,
            createLabel: campaign ? campaign('cta') : page('hero.cta'),
            plansLabel: landing('hero.plansCta'),
            secondary: occasionHeroSecondary(
                demoHref ? { href: demoHref, label: common('heroDemo') } : null,
                themesHref ? { href: themesHref, label: page('hero.themesCta') } : null,
            ),
        },
        qrLink: qrHref ? { href: qrHref, label: page('hero.qrLink') } : null,
        // "From 119€" only when config gave a price.
        trust: [...(page.raw('hero.trust') as string[]), ...(price.range === 'none' ? [] : [page('hero.trustPrice', price)])],
        visual,
    };
}
