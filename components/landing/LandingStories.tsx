'use client';

import { useTranslations } from 'next-intl';

import { LandingMoreStories, type LandingMoreStory } from '@/components/landing/LandingMoreStories';
import { type LandingStoryCopyData, LandingStoryRow } from '@/components/landing/LandingStoryRow';
import { landingStoryMedia } from '@/lib/landingMedia';

export function LandingStories() {
    const t = useTranslations('LandingPage.stories');
    const heading = t.raw('heading') as string[];
    const rows = t.raw('rows') as LandingStoryCopyData[];
    const moreStories = t.raw('moreStories') as LandingMoreStory[];

    return (
        <section className="platform bg-white px-5 py-[68px] min-[761px]:px-[clamp(22px,6vw,104px)] min-[761px]:py-[clamp(90px,11vw,180px)]" id="platformStories">
            {/* Eyebrow + heading */}
            <div className="section-intro min-[761px]:grid min-[761px]:grid-cols-[1fr_2.1fr] min-[761px]:items-start min-[761px]:gap-x-[6vw]">
                <div className="eyebrow pt-2.5 text-[13px] leading-[1.4] font-extrabold tracking-[0.14em] uppercase min-[761px]:col-start-2 min-[761px]:row-start-1 min-[761px]:mb-[22px] min-[761px]:pt-0">
                    {t('eyebrow')}
                </div>
                <h2 className="m-0 text-[clamp(48px,6.5vw,108px)] leading-[0.93] font-normal tracking-[-0.055em] text-[var(--ink)] [font-family:var(--editorial)] min-[761px]:col-start-2 min-[761px]:row-start-2">
                    {heading[0]}
                    <br />
                    {heading[1]}
                </h2>
                <p className="mt-6 max-w-[660px] text-[clamp(16px,1.45vw,22px)] leading-[1.55] text-[var(--ink)] min-[761px]:col-start-2 min-[761px]:row-start-3 min-[761px]:mt-[42px]">
                    {t('intro')}
                </p>
            </div>
            {/* Story rows */}
            <div className="showcase story-list mt-[50px] min-[761px]:mt-[clamp(80px,10vw,150px)]">
                {rows.map((copy, index) => (
                    <LandingStoryRow copy={copy} index={index} key={copy.tag} media={landingStoryMedia[index]} />
                ))}
            </div>
            <LandingMoreStories
                ariaLabel={t('moreLabel')}
                eyebrow={t('moreEyebrow')}
                heading={t('moreHeading')}
                mobileHint={t('mobileHint')}
                stories={moreStories}
            />
        </section>
    );
}
