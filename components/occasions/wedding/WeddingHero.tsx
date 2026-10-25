import { getTranslations } from 'next-intl/server';
import { Fragment } from 'react';

import { LandingHeader } from '@/components/landing/LandingHeader';
import { OccasionCommentCard } from '@/components/occasions/OccasionCommentCard';
import { OccasionHeroVisual } from '@/components/occasions/OccasionHeroVisual';
import { OccasionPostCard } from '@/components/occasions/OccasionPostCard';
import { WeddingPhoneFeed } from '@/components/occasions/wedding/feed/WeddingPhoneFeed';
import { WeddingHeroActions } from '@/components/occasions/wedding/WeddingHeroActions';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import { occasionHeaderLinks } from '@/lib/occasions/occasionSections';
import type { WeddingHeroFeedCopy, WeddingMockCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_HERO_MEDIA } from '@/lib/occasions/weddingMedia';

// The design's background: pink top left, gold top right, coral at the bottom, on white.
const SECTION_CLASS =
    'relative bg-white bg-[radial-gradient(42%_52%_at_12%_18%,rgba(248,154,176,0.28),transparent_70%),radial-gradient(40%_50%_at_92%_22%,rgba(252,186,99,0.3),transparent_70%),radial-gradient(50%_60%_at_70%_100%,rgba(255,118,95,0.16),transparent_70%)] text-[#151313]';

// The landing's hero visual, sized and placed as in the design: 115% of the column under 768 px,
// overlapping the copy column's edge from 768 to 900, half the grid from 901 up.
const VISUAL_CLASS = [
    'left-1/2 mt-5.5 w-[min(115%,510px)] -translate-x-1/2',
    'min-[768px]:left-0 min-[768px]:mt-2.5 min-[768px]:ml-[max(-20px_-_9vw,50%_-_310px)] min-[768px]:w-[min(620px,118vw)] min-[768px]:translate-x-[3%]',
    'min-[901px]:my-[-3%] min-[901px]:ml-0 min-[901px]:w-[min(860px,54vw)] min-[901px]:justify-self-center',
].join(' ');

type WeddingHeroProps = {
    alternatePaths: Record<Locale, string>;
    campaign: OccasionCampaign | null;
    createHref: string;
    // null: no wedding demo; the hero shows the create button only.
    demoHref: string | null;
    locale: Locale;
    price: OccasionPriceValues;
};

export async function WeddingHero({ alternatePaths, campaign, createHref, demoHref, locale, price }: WeddingHeroProps) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.WEDDING' });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage' });
    // A campaign may swap the body, the CTA label and the feed's cover. The h1 always stays the keyword.
    const c = campaign?.hero ? await getTranslations({ locale, namespace: `OccasionPages.campaigns.${campaign.id}` }) : null;
    const nav = landing.raw('hero.nav') as string[];
    const mobileNav = landing.raw('hero.mobileNav') as string[];
    const home = getPublicLandingPath(locale);
    // "From 119€" only when config gave a price.
    const trust = [...(t.raw('hero.trust') as string[]), ...(price.range === 'none' ? [] : [t('hero.trustPrice', price)])];
    const media = { ...WEDDING_HERO_MEDIA, cover: campaign?.hero?.image ?? WEDDING_HERO_MEDIA.cover };
    const [leftCard, rightCard] = media.cards;

    return (
        <section className={SECTION_CLASS}>
            {/* Header, on the hero's background */}
            <LandingHeader
                alternatePaths={alternatePaths}
                className="bg-transparent min-[761px]:backdrop-blur-none"
                homeHref={home}
                links={occasionHeaderLinks(nav, mobileNav, landing('faq.eyebrow'))}
                loginLabel={nav.at(-1)!}
                mobileLoginLabel={mobileNav.at(-1)!}
            />

            <div className="pt-6.5 pb-9 min-[421px]:pt-0 min-[768px]:pt-1.5 min-[768px]:pb-10 min-[901px]:pt-9.5 min-[901px]:pb-22.5">
                <div className="mx-auto grid w-[calc(100%-40px)] grid-cols-1 items-center min-[768px]:w-[min(1220px,calc(100%-64px))] min-[768px]:gap-[clamp(20px,3vw,48px)] min-[901px]:grid-cols-2">
                    {/* Copy */}
                    <div className="relative z-20">
                        {/* Breadcrumb */}
                        <nav aria-label={common('breadcrumbLabel')} className="mb-3.5 ml-1 min-[768px]:mb-4.5">
                            <ol className="m-0 flex list-none items-center gap-2 p-0 text-[11px] font-bold tracking-[0.06em] text-[#151313]/55 uppercase">
                                <li>
                                    <a className="text-[#151313] no-underline hover:underline" href={home}>
                                        StoryWall
                                    </a>
                                </li>
                                <li aria-hidden="true">›</li>
                                <li aria-current="page">{t('hero.breadcrumb')}</li>
                            </ol>
                        </nav>
                        {/* Kicker */}
                        <p className="mt-0 mb-4 text-[12px] leading-[1.2] font-medium tracking-[-0.02em] uppercase min-[768px]:mb-5.5 min-[768px]:ml-1 min-[768px]:text-[clamp(13px,0.9vw,16px)]">
                            {t.rich('hero.kicker', { b: (chunks) => <strong className="font-bold">{chunks}</strong> })}
                        </p>
                        {/* Title */}
                        <h1 className="m-0 [font-family:var(--editorial)] text-[clamp(37px,9vw,45px)] leading-[1.02] font-normal tracking-[-0.045em] min-[768px]:text-[clamp(50px,5.2vw,92px)] min-[768px]:leading-[0.91] min-[768px]:tracking-[-0.055em]">
                            {t.rich('hero.h1', {
                                em: (chunks) => (
                                    <em className="[background-image:var(--brand-gradient)] bg-clip-text text-transparent italic min-[768px]:pr-[0.06em]">
                                        {chunks}
                                    </em>
                                ),
                            })}
                        </h1>
                        {/* Subtitle */}
                        <p className="mt-5 mb-0 font-[Georgia,serif] text-[18px] leading-[1.3] min-[768px]:mt-6.5 min-[768px]:ml-1 min-[768px]:max-w-130 min-[768px]:text-[clamp(17px,1.35vw,21px)] min-[768px]:leading-[1.4]">
                            {t('hero.subtitle')}
                        </p>
                        {/* Body */}
                        <p className="mt-3.5 mb-0 text-[15px] leading-[1.55] text-[#151313]/74 min-[768px]:ml-1 min-[768px]:max-w-[min(460px,40vw)]">
                            {c ? c('lead') : t('hero.body')}
                        </p>
                        {/* Actions */}
                        <WeddingHeroActions
                            createHref={createHref}
                            createLabel={c ? c('cta') : t('hero.cta')}
                            demoHref={demoHref}
                            demoLabel={landing('hero.demoCta')}
                        />
                        {/* Trust line */}
                        <p className="mt-4.25 mb-0 flex flex-wrap gap-y-1.25 text-[10px] leading-[1.4] font-bold tracking-[0.035em] text-[#151313]/66 min-[768px]:mt-6 min-[768px]:ml-1 min-[768px]:gap-y-1.75 min-[768px]:text-[11px] min-[768px]:leading-[1.25]">
                            {trust.map((item, index) => (
                                <Fragment key={item}>
                                    {index > 0 ? (
                                        <span aria-hidden="true" className="mx-2.5">
                                            ·
                                        </span>
                                    ) : null}
                                    <span>{item}</span>
                                </Fragment>
                            ))}
                        </p>
                    </div>

                    {/* Visual: the phone feed, two post cards and two comment cards */}
                    <OccasionHeroVisual
                        className={VISUAL_CLASS}
                        comments={[
                            <OccasionCommentCard faces={media.comments[0]} key="heart" variant="heart" />,
                            <OccasionCommentCard faces={media.comments[1]} key="avatar" variant="avatar" />,
                        ]}
                        feed={
                            <WeddingPhoneFeed
                                copy={t.raw('hero.feed') as WeddingHeroFeedCopy}
                                media={media}
                                mock={t.raw('mock') as WeddingMockCopy}
                            />
                        }
                        posts={[
                            <OccasionPostCard avatar={leftCard.author} key="left" photo={leftCard.photo} tilt="left" />,
                            <OccasionPostCard avatar={rightCard.author} key="right" photo={rightCard.photo} tilt="right" />,
                        ]}
                    />
                </div>
            </div>
        </section>
    );
}
