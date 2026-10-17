import { getTranslations } from 'next-intl/server';
import { preload } from 'react-dom';

import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHeroActions } from '@/components/landing/LandingHeroActions';
import { OccasionHeroVisual } from '@/components/occasions/OccasionHeroVisual';
import { type OccasionFeedCopy, OccasionPhoneFeed } from '@/components/occasions/OccasionPhoneFeed';
import { OccasionPostCard } from '@/components/occasions/OccasionPostCard';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import type { OccasionHeroFeed } from '@/lib/occasions/occasionMedia';
import type { Occasion } from '@/lib/occasions/occasions';
import { OCCASION_SECTION_IDS } from '@/lib/occasions/occasionSections';

// Same file as the hero content's background class, which Tailwind needs written out in full.
const HERO_BACKGROUND = '/landing/hero-background-v75.webp';

type OccasionHeroProps = {
    alternatePaths: Record<Locale, string>;
    campaign: OccasionCampaign | null;
    createHref: string;
    // null → no demo for this type; the hero shows the create button only.
    demoHref: string | null;
    feed: OccasionHeroFeed | null;
    locale: Locale;
    occasion: Occasion;
};

export async function OccasionHero({ alternatePaths, campaign, createHref, demoHref, feed, locale, occasion }: OccasionHeroProps) {
    preload(HERO_BACKGROUND, { as: 'image', fetchPriority: 'high' });
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.hero` });
    const landing = await getTranslations({ locale, namespace: 'LandingPage' });
    // A campaign may swap the sentence, CTA label and the feed's cover. The H1 always stays the keyword.
    const c = campaign?.hero ? await getTranslations({ locale, namespace: `OccasionPages.campaigns.${campaign.id}` }) : null;
    const nav = landing.raw('hero.nav') as string[];
    const mobileNav = landing.raw('hero.mobileNav') as string[];
    const links = [
        { href: `#${OCCASION_SECTION_IDS.howItWorks}`, label: nav[1]!, mobileLabel: mobileNav[1]! },
        { href: `#${OCCASION_SECTION_IDS.features}`, label: nav[2]!, mobileLabel: mobileNav[2]! },
        { href: `#${OCCASION_SECTION_IDS.pricing}`, label: nav[3]!, mobileLabel: mobileNav[3]! },
        { href: `#${OCCASION_SECTION_IDS.faq}`, label: landing('faq.eyebrow'), mobileLabel: landing('faq.eyebrow') },
    ];
    const cover = campaign?.hero?.image ?? feed?.cover;

    return (
        <section aria-labelledby="occasion-hero-title" className="relative isolate overflow-hidden bg-white text-[#151313] min-[761px]:min-h-svh">
            {/* Header */}
            <LandingHeader
                alternatePaths={alternatePaths}
                homeHref={getPublicLandingPath(locale)}
                links={links}
                loginLabel={nav.at(-1)!}
                mobileLoginLabel={mobileNav.at(-1)!}
            />

            {/* Hero content */}
            <div className="relative bg-[url('/landing/hero-background-v75.webp')] bg-cover bg-center pt-6 pb-21.5 min-[421px]:max-[760px]:pt-10.75 min-[761px]:min-h-[calc(100svh-112px)] min-[761px]:py-0">
                <div className="relative mx-auto grid w-[calc(100%-40px)] max-w-305 grid-cols-1 items-center min-[761px]:min-h-[calc(100svh-112px)] min-[761px]:w-[calc(100%-64px)] min-[761px]:grid-cols-2">
                    <div className="relative z-20 self-center min-[761px]:py-2.5">
                        {/* Keyword: the page's h1 */}
                        <h1
                            className="m-0 max-w-135 bg-[linear-gradient(90deg,#d27b9b_0%,#e78274_40%,#f4905f_100%)] bg-clip-text text-[12px] leading-[1.45] font-black tracking-[0.16em] text-transparent uppercase min-[761px]:text-[13px]"
                            id="occasion-hero-title"
                        >
                            {t('h1')}
                        </h1>

                        {/* Title */}
                        <p className="mt-4 mb-0 max-w-142.5 font-[Baskerville,Georgia,serif] text-[clamp(36px,10.5vw,52px)] leading-[.98] font-normal tracking-[-.05em] text-balance min-[761px]:text-[clamp(46px,3.6vw,68px)]">
                            {t.rich('headline', { b: (chunks) => <strong className="font-bold">{chunks}</strong> })}
                        </p>

                        {/* Summary */}
                        <p className="mt-5 mb-0 max-w-135 text-[clamp(18px,1.35vw,22px)] leading-[1.35] text-balance">{c ? c('lead') : t('lead')}</p>
                        <p className="mt-3 mb-0 max-w-135 text-[clamp(14px,1vw,16px)] leading-snug text-[#151313]/70">{t('promise')}</p>

                        {/* Actions */}
                        <LandingHeroActions
                            demoHref={demoHref ?? undefined}
                            demoLabel={demoHref ? landing('hero.demoCta') : undefined}
                            main={{ href: createHref, arrow: '↗', click: { event: 'create', placement: 'hero' } }}
                            mainLabel={c ? c('cta') : t('cta')}
                        />
                    </div>

                    {/* Phone and floating posts */}
                    {feed && cover ? (
                        <OccasionHeroVisual
                            feed={<OccasionPhoneFeed copy={t.raw('feed') as OccasionFeedCopy} media={{ ...feed, cover }} />}
                            posts={[
                                <OccasionPostCard avatar={feed.avatars[1]!} key="left" photo={feed.cards[0]} tilt="left" />,
                                <OccasionPostCard avatar={feed.avatars[2]!} key="right" photo={feed.cards[1]} tilt="right" />,
                            ]}
                        />
                    ) : (
                        <OccasionHeroVisual />
                    )}
                </div>
            </div>
        </section>
    );
}
