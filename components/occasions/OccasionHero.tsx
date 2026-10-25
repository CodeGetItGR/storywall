import { getTranslations } from 'next-intl/server';

import { KeywordHero } from '@/components/landing/KeywordHero';
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
import { occasionHeaderLinks } from '@/lib/occasions/occasionSections';

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
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.hero` });
    const landing = await getTranslations({ locale, namespace: 'LandingPage' });
    // A campaign may swap the sentence, CTA label and the feed's cover. The H1 always stays the keyword.
    const c = campaign?.hero ? await getTranslations({ locale, namespace: `OccasionPages.campaigns.${campaign.id}` }) : null;
    const nav = landing.raw('hero.nav') as string[];
    const mobileNav = landing.raw('hero.mobileNav') as string[];
    const links = occasionHeaderLinks(nav, mobileNav, landing('faq.eyebrow'));
    const cover = campaign?.hero?.image ?? feed?.cover;

    return (
        <KeywordHero
            actions={
                <LandingHeroActions
                    demoHref={demoHref ?? undefined}
                    demoLabel={demoHref ? landing('hero.demoCta') : undefined}
                    main={{ href: createHref, arrow: '↗', click: { event: 'create', placement: 'hero' } }}
                    mainLabel={c ? c('cta') : t('cta')}
                />
            }
            // The wedding h1 marks its gradient words with <em>; this hero shows plain text.
            h1={t.markup('h1', { em: (chunks) => chunks })}
            header={
                <LandingHeader
                    alternatePaths={alternatePaths}
                    homeHref={getPublicLandingPath(locale)}
                    links={links}
                    loginLabel={nav.at(-1)!}
                    mobileLoginLabel={mobileNav.at(-1)!}
                />
            }
            headline={t.rich('headline', { b: (chunks) => <strong className="font-bold">{chunks}</strong> })}
            lead={c ? c('lead') : t('lead')}
            note={t('promise')}
            visual={
                feed && cover ? (
                    <OccasionHeroVisual
                        feed={<OccasionPhoneFeed copy={t.raw('feed') as OccasionFeedCopy} media={{ ...feed, cover }} />}
                        posts={[
                            <OccasionPostCard avatar={feed.avatars[1]!} key="left" photo={feed.cards[0]} tilt="left" />,
                            <OccasionPostCard avatar={feed.avatars[2]!} key="right" photo={feed.cards[1]} tilt="right" />,
                        ]}
                    />
                ) : (
                    <OccasionHeroVisual />
                )
            }
        />
    );
}
