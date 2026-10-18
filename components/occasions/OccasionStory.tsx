import { getTranslations } from 'next-intl/server';
import { Fragment } from 'react';

import { LandingStoryRow } from '@/components/landing/LandingStoryRow';
import { LandingStoryThemes } from '@/components/landing/LandingStoryThemes';
import type { Locale } from '@/i18n/config';
import type { LandingImageAsset } from '@/lib/landingMedia';
import type { LandingTheme } from '@/lib/landingThemes';
import { landingSectionAttributes } from '@/lib/landingTracking';
import type { Occasion } from '@/lib/occasions/occasions';

type Step = { title: string; heading: string; body: string };
type StoryRowCopy = { galleryLabel: string; imageAlts: string[] };

type OccasionStoryProps = {
    createHref: string;
    locale: Locale;
    // Before, on the day, after: a gallery each.
    moments: readonly LandingImageAsset[][];
    occasion: Occasion;
    // Shown under the first row; null or empty leaves them out.
    themes: LandingTheme[] | null;
};

// Before, on the day, after, as the landing's story rows: photos on one side, copy on the other.
export async function OccasionStory({ createHref, locale, moments, occasion, themes }: OccasionStoryProps) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const steps = t.raw('timeline') as Step[];
    const rows = t.raw('story.rows') as StoryRowCopy[];
    const heading = t.raw('story.heading') as string[];

    return (
        <section className="platform bg-white py-17 min-[761px]:py-[clamp(90px,11vw,180px)]" {...landingSectionAttributes('stories')}>
            {/* Eyebrow + heading */}
            <div className="section-intro px-5 min-[761px]:grid min-[761px]:grid-cols-[1fr_2.1fr] min-[761px]:items-start min-[761px]:gap-x-[6vw]">
                <div className="eyebrow pt-2.5 text-[13px] leading-[1.4] font-extrabold tracking-[0.14em] uppercase min-[761px]:col-start-2 min-[761px]:row-start-1 min-[761px]:mb-5.5 min-[761px]:pt-0">
                    {t('story.eyebrow')}
                </div>
                <h2 className="m-0 [font-family:var(--editorial)] text-[clamp(48px,6.5vw,108px)] leading-[0.93] font-normal tracking-[-0.055em] text-ink min-[761px]:col-start-2 min-[761px]:row-start-2">
                    {heading[0]}
                    <br />
                    {heading[1]}
                </h2>
                <p className="mt-6 max-w-165 text-[clamp(16px,1.45vw,22px)] leading-[1.55] text-ink min-[761px]:col-start-2 min-[761px]:row-start-3 min-[761px]:mt-10.5">
                    {t('story.intro')}
                </p>
            </div>

            {/* Moments */}
            <div className="showcase story-list mt-12.5 min-[761px]:mt-[clamp(80px,10vw,150px)]">
                {steps.map((step, index) => {
                    const gallery = moments[index] ?? [];
                    return (
                        <Fragment key={step.title}>
                            <LandingStoryRow
                                copy={{
                                    galleryLabel: rows[index]!.galleryLabel,
                                    imageAlts: rows[index]!.imageAlts,
                                    paragraphSegments: [[{ text: step.body }]],
                                    tag: step.title,
                                    titleSegments: [{ text: step.heading }],
                                }}
                                demoLabel=""
                                index={index}
                                locale={locale}
                                media={{ gallery, main: gallery[0]! }}
                                occasionLabel=""
                                occasions={[]}
                            />

                            {/* Themes, after the first row with the page's side padding: the row's photo runs to the edge */}
                            {index === 0 && themes && themes.length > 0 ? (
                                <div className="pb-6 min-[761px]:px-[clamp(22px,4vw,72px)] min-[761px]:pb-[clamp(42px,5vw,78px)]">
                                    <LandingStoryThemes
                                        copy={{
                                            cta: t('hero.cta'),
                                            eyebrow: t('themes.eyebrow'),
                                            heading: t('themes.heading'),
                                            intro: t('themes.intro'),
                                            listLabel: t('themes.eyebrow'),
                                        }}
                                        href={createHref}
                                        themes={themes}
                                    />
                                </div>
                            ) : null}
                        </Fragment>
                    );
                })}
            </div>
        </section>
    );
}
