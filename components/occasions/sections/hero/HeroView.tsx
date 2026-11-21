import { Fragment, type ReactNode } from 'react';

import { LandingHeader, type LandingHeaderLink } from '@/components/landing/LandingHeader';
import { OccasionHeroActions } from '@/components/occasions/OccasionHeroActions';
import { OccasionHeroVisual } from '@/components/occasions/OccasionHeroVisual';
import type { Locale } from '@/i18n/config';
import type { HeroSecondaryLink } from '@/lib/landingHero';
import { qrLinkAttributes } from '@/lib/linkClicks';

// The design's background: pink top left, gold top right, coral at the bottom, on white.
const SECTION_CLASS =
    'relative overflow-x-clip bg-white bg-[radial-gradient(42%_52%_at_12%_18%,rgba(248,154,176,0.28),transparent_70%),radial-gradient(40%_50%_at_92%_22%,rgba(252,186,99,0.3),transparent_70%),radial-gradient(50%_60%_at_70%_100%,rgba(255,118,95,0.16),transparent_70%)] text-[#151313]';

// The landing's hero visual: as wide as the landing's phone under 768 px (the section clips the overflow),
// overlapping the copy column's edge from 768 to 900, half the grid from 901 up.
const VISUAL_CLASS = [
    'left-1/2 mt-5.5 ml-[3.7vw] w-[137vw] -translate-x-1/2',
    'min-[768px]:left-0 min-[768px]:mt-2.5 min-[768px]:ml-[max(-20px_-_9vw,50%_-_310px)] min-[768px]:w-[min(620px,118vw)] min-[768px]:translate-x-[3%]',
    'min-[901px]:my-[-3%] min-[901px]:ml-0 min-[901px]:w-[min(860px,54vw)] min-[901px]:justify-self-center',
].join(' ');

export type HeroViewProps = {
    alternatePaths: Record<Locale, string>;
    breadcrumb: { current: string; label: string };
    header: { links: LandingHeaderLink[]; loginLabel: string; mobileLoginLabel: string };
    homeHref: string;
    kicker: ReactNode;
    // The h1: the page's keyword.
    title: ReactNode;
    subtitle: string;
    body: string;
    actions: { createHref: string; createLabel: string; plansLabel: string; secondary: HeroSecondaryLink | null };
    // The QR wedding page while it is live and the page links to it, else null.
    qrLink: { href: string; label: string } | null;
    trust: string[];
    // An occasion's own phone feed and post cards; empty → the landing's.
    visual: { feed?: ReactNode; posts?: readonly [ReactNode, ReactNode] };
};

export function HeroView({ actions, alternatePaths, body, breadcrumb, header, homeHref, kicker, qrLink, subtitle, title, trust, visual }: HeroViewProps) {
    return (
        <section className={SECTION_CLASS}>
            {/* Header, on the hero's background */}
            <LandingHeader
                alternatePaths={alternatePaths}
                className="bg-transparent min-[761px]:backdrop-blur-none"
                homeHref={homeHref}
                links={header.links}
                loginLabel={header.loginLabel}
                mobileLoginLabel={header.mobileLoginLabel}
            />

            {/* Body: on phones the bottom padding makes room for the phone and cards hanging about 25vw below the visual */}
            <div className="pt-6.5 pb-[calc(25.5vw+16px)] min-[421px]:pt-0 min-[761px]:pb-9 min-[768px]:pt-1.5 min-[768px]:pb-10 min-[901px]:pt-9.5 min-[901px]:pb-22.5">
                <div className="mx-auto grid w-[calc(100%-40px)] grid-cols-1 items-center min-[768px]:w-[min(1220px,calc(100%-64px))] min-[768px]:gap-[clamp(20px,3vw,48px)] min-[901px]:grid-cols-2">
                    {/* Copy */}
                    <div className="relative z-20">
                        {/* Breadcrumb */}
                        <nav aria-label={breadcrumb.label} className="mb-3.5 min-[768px]:mb-4.5 min-[768px]:ml-1">
                            <ol className="m-0 flex list-none items-center gap-2 p-0 text-[11px] leading-[normal] font-bold tracking-[0.06em] text-[#151313]/55 uppercase">
                                <li>
                                    <a className="text-[#151313] no-underline hover:underline" href={homeHref}>
                                        StoryWall
                                    </a>
                                </li>
                                <li aria-hidden="true">›</li>
                                <li aria-current="page">{breadcrumb.current}</li>
                            </ol>
                        </nav>
                        {/* Kicker */}
                        <p className="mt-0 mb-4 text-[12px] leading-[1.2] font-medium tracking-[-0.02em] uppercase min-[768px]:mb-5.5 min-[768px]:ml-1 min-[768px]:text-[clamp(13px,0.9vw,16px)]">
                            {kicker}
                        </p>
                        {/* Title */}
                        <h1 className="m-0 [font-family:var(--editorial)] text-[clamp(37px,9vw,45px)] leading-[1.1] font-normal tracking-[-0.045em] min-[768px]:text-[clamp(50px,5.2vw,92px)] min-[768px]:leading-[0.91] min-[768px]:tracking-[-0.055em]">
                            {title}
                        </h1>
                        {/* Subtitle */}
                        <p className="mt-5 mb-0 font-[Georgia,serif] text-[18px] leading-[1.3] min-[768px]:mt-6.5 min-[768px]:ml-1 min-[768px]:max-w-130 min-[768px]:text-[clamp(17px,1.35vw,21px)] min-[768px]:leading-[1.4]">
                            {subtitle}
                        </p>
                        {/* Body */}
                        <p className="mt-3.5 mb-0 text-[15px] leading-[1.55] text-[#151313]/74 min-[768px]:ml-1 min-[768px]:max-w-[min(460px,40vw)]">
                            {body}
                        </p>
                        {/* Actions */}
                        <OccasionHeroActions
                            createHref={actions.createHref}
                            createLabel={actions.createLabel}
                            plansLabel={actions.plansLabel}
                            secondary={actions.secondary}
                        />
                        {/* QR page link */}
                        {qrLink ? (
                            <a
                                className="mt-3.5 inline-block text-[13px] font-semibold text-[#151313] underline underline-offset-3 focus-ring min-[768px]:mt-4.5 min-[768px]:ml-1"
                                href={qrLink.href}
                                {...qrLinkAttributes('hero')}
                            >
                                {qrLink.label}
                                <span aria-hidden="true"> →</span>
                            </a>
                        ) : null}
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

                    {/* Visual: the phone feed and floating cards */}
                    <OccasionHeroVisual className={VISUAL_CLASS} feed={visual.feed} posts={visual.posts} />
                </div>
            </div>
        </section>
    );
}
