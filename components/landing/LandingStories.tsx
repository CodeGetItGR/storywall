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
        <section className="platform" id="platformStories">
            <div className="section-intro">
                <div className="eyebrow">{t('eyebrow')}</div>
                <h2>
                    {heading[0]}
                    <br />
                    {heading[1]}
                </h2>
                <p>{t('intro')}</p>
            </div>
            <div className="showcase">
                <div className="story-list">
                    {rows.map((copy, index) => (
                        <LandingStoryRow copy={copy} index={index} key={copy.tag} media={landingStoryMedia[index]} />
                    ))}
                </div>
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
