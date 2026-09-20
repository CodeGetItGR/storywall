import { getTranslations } from 'next-intl/server';

import { LandingMoreStories, type LandingMoreStory } from '@/components/landing/LandingMoreStories';
import { type LandingStoryCopyData, LandingStoryRow } from '@/components/landing/LandingStoryRow';
import { landingStoryMedia } from '@/lib/landingMedia';

export async function LandingStories() {
    const t = await getTranslations('LandingPage.stories');
    const heading = t.raw('heading') as string[];
    const rows = t.raw('rows') as LandingStoryCopyData[];
    const moreStories = t.raw('moreStories') as LandingMoreStory[];

    return (
        <section className="platform bg-white py-17 min-[761px]:py-[clamp(90px,11vw,180px)]" id="platformStories">
            {/* Eyebrow + heading */}
            <div className="section-intro px-5 min-[761px]:grid min-[761px]:grid-cols-[1fr_2.1fr] min-[761px]:items-start min-[761px]:gap-x-[6vw]">
                <div className="eyebrow pt-2.5 text-[13px] leading-[1.4] font-extrabold tracking-[0.14em] uppercase min-[761px]:col-start-2 min-[761px]:row-start-1 min-[761px]:mb-5.5 min-[761px]:pt-0">
                    {t('eyebrow')}
                </div>
                <h2 className="m-0 text-[clamp(48px,6.5vw,108px)] leading-[0.93] font-normal tracking-[-0.055em] text-ink [font-family:var(--editorial)] min-[761px]:col-start-2 min-[761px]:row-start-2">
                    {heading[0]}
                    <br />
                    {heading[1]}
                </h2>
                <p className="mt-6 max-w-165 text-[clamp(16px,1.45vw,22px)] leading-[1.55] text-ink min-[761px]:col-start-2 min-[761px]:row-start-3 min-[761px]:mt-10.5">
                    {t('intro')}
                </p>
            </div>
            {/* Story rows */}
            <div className="showcase story-list mt-12.5 min-[761px]:mt-[clamp(80px,10vw,150px)]">
                {rows.map((copy, index) => (
                    <LandingStoryRow copy={copy} index={index} key={copy.tag} media={landingStoryMedia[index]} />
                ))}
            </div>
            <LandingMoreStories ariaLabel={t('moreLabel')} eyebrow={t('moreEyebrow')} heading={t('moreHeading')} stories={moreStories} />
        </section>
    );
}
