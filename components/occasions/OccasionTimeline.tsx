import { getTranslations } from 'next-intl/server';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { LandingThemeTile } from '@/components/landing/LandingThemeTile';
import type { Locale } from '@/i18n/config';
import type { LandingImageAsset } from '@/lib/landingMedia';
import type { LandingTheme } from '@/lib/landingThemes';
import { landingSectionAttributes } from '@/lib/landingTracking';
import type { Occasion } from '@/lib/occasions/occasions';

type Step = { title: string; heading: string; body: string };
type StepPhotosCopy = { galleryLabel: string; imageAlts: string[] };

type OccasionTimelineProps = {
    locale: Locale;
    // Before, on the day, after: a few photos each.
    moments: readonly LandingImageAsset[][];
    occasion: Occasion;
    // Shown in the first step; null or empty leaves them out.
    themes: LandingTheme[] | null;
};

// Before, on the day, after, as one vertical timeline.
export async function OccasionTimeline({ locale, moments, occasion, themes }: OccasionTimelineProps) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const steps = t.raw('timeline') as Step[];
    const photosCopy = t.raw('story.rows') as StepPhotosCopy[];
    const heading = t.raw('story.heading') as string[];

    return (
        <section
            className="bg-white px-5 py-17 min-[761px]:grid min-[761px]:grid-cols-[1fr_2.1fr] min-[761px]:gap-x-[6vw] min-[761px]:px-[5vw] min-[761px]:py-[clamp(90px,10vw,160px)]"
            {...landingSectionAttributes('stories')}
        >
            {/* Eyebrow: its own column from 761px, like the plans below */}
            <p className="m-0 text-[13px] leading-[1.4] font-extrabold tracking-[0.14em] uppercase min-[761px]:pt-3">{t('story.eyebrow')}</p>

            {/* Heading */}
            <div>
                <h2 className="mt-4 mb-0 [font-family:var(--editorial)] text-[clamp(44px,6vw,96px)] leading-[0.93] font-normal tracking-[-0.055em] text-ink min-[761px]:mt-0">
                    {heading[0]}
                    <br />
                    {heading[1]}
                </h2>
                <p className="mt-6 mb-0 max-w-165 text-[clamp(16px,1.35vw,20px)] leading-[1.55] text-ink min-[761px]:mt-8">{t('story.intro')}</p>
            </div>

            {/* Timeline */}
            <ol className="m-0 mt-12 list-none p-0 min-[761px]:col-start-2 min-[761px]:mt-[clamp(64px,7vw,110px)]">
                {steps.map((step, index) => {
                    const photos = moments[index] ?? [];
                    const copy = photosCopy[index];
                    const isLast = index === steps.length - 1;
                    return (
                        <li className="grid grid-cols-[14px_1fr] gap-x-5 min-[761px]:grid-cols-[16px_1fr] min-[761px]:gap-x-9" key={step.title}>
                            {/* Marker and line */}
                            <div aria-hidden="true" className="relative flex justify-center">
                                <span className="relative z-1 mt-1 block size-3.5 rounded-full bg-[linear-gradient(135deg,#f89ab0,#f4b37b)] ring-4 ring-white min-[761px]:size-4" />
                                {isLast ? null : <span className="absolute top-4 bottom-0 w-px bg-[#151313]/14" />}
                            </div>

                            {/* Step */}
                            <div className={isLast ? 'min-w-0' : 'min-w-0 pb-14 min-[761px]:pb-20'}>
                                <p className="m-0 text-[13px] leading-[1.4] font-extrabold tracking-[0.14em] text-[#e97a6f] uppercase">
                                    {step.title}
                                </p>
                                <h3 className="mt-3 mb-0 [font-family:var(--editorial)] text-[clamp(30px,8vw,40px)] leading-[1] font-normal tracking-[-0.04em] text-balance text-ink min-[761px]:text-[clamp(36px,3.2vw,52px)]">
                                    {step.heading}
                                </h3>
                                <p className="mt-3 mb-0 max-w-140 text-[16px] leading-[1.55] text-ink-muted min-[761px]:mt-4 min-[761px]:text-[17px]">
                                    {step.body}
                                </p>

                                {/* Photos: a swipeable row on phones, three columns from 761px */}
                                {photos.length > 0 ? (
                                    <ul
                                        aria-label={copy?.galleryLabel}
                                        className="mt-6 -mr-5 mb-0 no-scrollbar flex snap-x snap-mandatory list-none gap-2.5 overflow-x-auto pr-5 pl-0 min-[761px]:mt-8 min-[761px]:mr-0 min-[761px]:grid min-[761px]:grid-cols-3 min-[761px]:gap-3 min-[761px]:overflow-visible min-[761px]:pr-0"
                                    >
                                        {photos.map((photo, photoIndex) => (
                                            <li
                                                className="w-[58vw] max-w-60 shrink-0 snap-start min-[761px]:w-auto min-[761px]:max-w-none"
                                                key={photo.src}
                                            >
                                                <ProtectedImage
                                                    alt={copy?.imageAlts[photoIndex] ?? ''}
                                                    className="aspect-square h-auto w-full rounded-[18px] object-cover"
                                                    height={photo.height}
                                                    loading="lazy"
                                                    sizes="(min-width: 761px) 22vw, 58vw"
                                                    src={photo.src}
                                                    width={photo.width}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}

                                {/* Themes */}
                                {index === 0 && themes && themes.length > 0 ? (
                                    <div className="mt-9 min-[761px]:mt-11">
                                        <p className="m-0 text-[13px] leading-[1.4] font-extrabold tracking-[0.14em] text-ink-muted uppercase">
                                            {t('themes.eyebrow')}
                                        </p>
                                        <ul
                                            aria-label={t('themes.eyebrow')}
                                            className="mt-4 -mr-5 mb-0 no-scrollbar flex snap-x snap-mandatory list-none gap-3 overflow-x-auto pr-5 pl-0 min-[761px]:mr-0 min-[761px]:grid min-[761px]:grid-cols-[repeat(5,minmax(0,150px))] min-[761px]:overflow-visible min-[761px]:pr-0"
                                        >
                                            {themes.map((theme) => (
                                                <LandingThemeTile key={theme.id} theme={theme} />
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
