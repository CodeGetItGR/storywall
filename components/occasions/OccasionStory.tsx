import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { LandingStoryGallery } from '@/components/landing/LandingStoryGallery';
import { OccasionFloats } from '@/components/occasions/OccasionFloats';
import { OccasionSectionHeading } from '@/components/occasions/OccasionSectionHeading';
import type { Locale } from '@/i18n/config';
import type { OccasionMomentMedia } from '@/lib/occasions/occasionMedia';
import type { Occasion } from '@/lib/occasions/occasions';

type Step = { title: string; heading: string; body: string };

type OccasionStoryProps = { locale: Locale; moments: readonly OccasionMomentMedia[]; occasion: Occasion };

// Before, on the day, after: one row per moment, photo and copy alternating sides.
export async function OccasionStory({ locale, moments, occasion }: OccasionStoryProps) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const steps = t.raw('timeline') as Step[];

    return (
        <section className="px-5 py-14 min-[761px]:px-[5vw] min-[761px]:py-24">
            {/* Heading */}
            <OccasionSectionHeading>{common('timelineHeading')}</OccasionSectionHeading>

            {/* Moments */}
            <div className="mt-10 flex flex-col gap-20 min-[761px]:mt-16 min-[761px]:gap-32">
                {steps.map((step, index) => {
                    const media = moments[index];
                    const flipped = index % 2 === 1;
                    return (
                        <article
                            className="story-row grid items-center gap-10 min-[761px]:grid-cols-2 min-[761px]:gap-[6vw]"
                            data-row={index}
                            key={step.title}
                        >
                            {/* Visual */}
                            {media ? (
                                <div className={`occasion-reveal relative ${flipped ? 'min-[761px]:order-2' : ''}`}>
                                    {'gallery' in media ? (
                                        <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] shadow-[0_30px_60px_-30px_rgba(21,19,19,0.45)]">
                                            <LandingStoryGallery
                                                alts={t.raw('story.imageAlts') as string[]}
                                                ariaLabel={t('story.galleryLabel')}
                                                images={media.gallery}
                                                rowIndex={index}
                                            />
                                        </div>
                                    ) : (
                                        <Image
                                            alt=""
                                            className="mx-auto aspect-[4/5] h-auto w-full max-w-110 rounded-[28px] object-cover shadow-[0_30px_60px_-30px_rgba(21,19,19,0.45)]"
                                            height={media.photo.height}
                                            sizes="(min-width: 761px) 40vw, 90vw"
                                            src={media.photo.src}
                                            width={media.photo.width}
                                        />
                                    )}
                                    <OccasionFloats floats={media.floats} />
                                </div>
                            ) : null}

                            {/* Copy */}
                            <div className="occasion-reveal [--reveal-delay:120ms]">
                                <p className="occasion-label m-0 text-xs font-black tracking-[0.18em] uppercase min-[761px]:text-[13px]">{step.title}</p>
                                <h3 className="mt-4 mb-0 max-w-[16ch] [font-family:var(--editorial)] text-[clamp(32px,9vw,44px)] leading-[1.02] font-normal tracking-[-0.035em] text-balance min-[761px]:text-[clamp(44px,4.2vw,68px)]">
                                    {step.heading}
                                </h3>
                                <p className="mt-5 mb-0 max-w-120 text-base leading-[1.6] text-pretty text-[#3d3836] min-[761px]:text-[17px]">{step.body}</p>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
