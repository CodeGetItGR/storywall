import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { OccasionCtaLink } from '@/components/occasions/OccasionCtaLink';
import { OccasionFloats } from '@/components/occasions/OccasionFloats';
import type { Locale } from '@/i18n/config';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import type { OccasionFloat } from '@/lib/occasions/occasionMedia';
import type { Occasion } from '@/lib/occasions/occasions';

type OccasionHeroProps = { campaign: OccasionCampaign | null; createHref: string; floats: OccasionFloat[]; locale: Locale; occasion: Occasion };

export async function OccasionHero({ campaign, createHref, floats, locale, occasion }: OccasionHeroProps) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.hero` });
    // A campaign may swap the sentence, CTA label and image. The H1 always stays the keyword.
    const c = campaign?.hero ? await getTranslations({ locale, namespace: `OccasionPages.campaigns.${campaign.id}` }) : null;
    const image = campaign?.hero?.image ?? occasion.heroImage;

    return (
        <section className="grid gap-8 px-5 pt-4 pb-16 min-[761px]:grid-cols-[1fr_1.05fr] min-[761px]:items-center min-[761px]:gap-[5vw] min-[761px]:px-[5vw] min-[761px]:pt-8 min-[761px]:pb-20">
            {/* Copy */}
            <div>
                {/* The keyword stays the h1; the headline below is display text. */}
                <h1 className="occasion-label m-0 text-xs leading-[1.5] font-black tracking-[0.18em] uppercase min-[761px]:text-[13px]">{t('h1')}</h1>
                <p className="mt-4 mb-0 [font-family:var(--editorial)] text-[clamp(40px,11vw,56px)] leading-[1] font-normal tracking-[-0.035em] text-balance min-[761px]:text-[clamp(56px,5.2vw,84px)]">
                    {t.rich('headline', { b: (chunks) => <strong className="font-bold">{chunks}</strong> })}
                </p>
                <p className="mt-6 mb-0 max-w-140 text-base leading-[1.6] text-pretty text-[#3d3836]">{c ? c('lead') : t('lead')}</p>
                <p className="mt-4 mb-0 max-w-140 text-base leading-[1.6] font-bold text-pretty">{t('promise')}</p>
                <OccasionCtaLink className="mt-8" href={createHref}>
                    {c ? c('cta') : t('cta')}
                </OccasionCtaLink>
            </div>
            {/* Photo, with app pieces floating over it */}
            <div className="relative mx-2 min-[761px]:mx-6">
                {image ? (
                    <Image
                        priority
                        alt={t('imageAlt')}
                        className="aspect-[4/3] h-auto w-full rounded-[28px] object-cover shadow-[0_30px_60px_-30px_rgba(21,19,19,0.45)]"
                        height={image.height}
                        sizes="(min-width: 761px) 50vw, 100vw"
                        src={image.src}
                        width={image.width}
                    />
                ) : (
                    <div aria-hidden="true" className="aspect-[4/3] w-full rounded-[28px] bg-[linear-gradient(135deg,#d27b9b_0%,#e78274_28%,#f4905f_58%,#fcba63_100%)]" />
                )}
                <OccasionFloats floats={floats} />
            </div>
        </section>
    );
}
