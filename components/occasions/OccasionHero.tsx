import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import type { Occasion } from '@/lib/occasions/occasions';

type OccasionHeroProps = { campaign: OccasionCampaign | null; createHref: string; locale: Locale; occasion: Occasion };

export async function OccasionHero({ campaign, createHref, locale, occasion }: OccasionHeroProps) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.hero` });
    // A campaign may swap the sentence, CTA label and image. The H1 always stays the keyword.
    const c = campaign?.hero ? await getTranslations({ locale, namespace: `OccasionPages.campaigns.${campaign.id}` }) : null;
    const image = campaign?.hero?.image ?? occasion.heroImage;

    return (
        <section className="grid gap-8 px-5 pt-6 pb-12 min-[761px]:grid-cols-[1fr_1fr] min-[761px]:items-center min-[761px]:px-[5vw] min-[761px]:pb-20">
            {/* Copy */}
            <div>
                <h1 className="m-0 [font-family:var(--editorial)] text-[clamp(40px,11vw,56px)] leading-[0.95] font-normal tracking-[-0.05em] text-balance min-[761px]:text-[clamp(56px,5.6vw,92px)]">
                    {t('h1')}
                </h1>
                <p className="mt-5 max-w-140 text-base leading-[1.55] text-pretty">{c ? c('lead') : t('lead')}</p>
                <a
                    className="mt-7 inline-flex min-h-13 items-center rounded-full bg-[#151313] px-6 text-xs font-black tracking-[0.08em] text-white uppercase no-underline"
                    href={createHref}
                >
                    {c ? c('cta') : t('cta')}
                </a>
            </div>
            {/* Photo */}
            {image ? (
                <Image
                    priority
                    alt={t('imageAlt')}
                    className="h-auto w-full rounded-br-[42px] object-cover"
                    height={image.height}
                    sizes="(min-width: 761px) 45vw, 100vw"
                    src={image.src}
                    width={image.width}
                />
            ) : (
                <div aria-hidden="true" className="aspect-[4/3] w-full rounded-br-[42px] bg-[linear-gradient(135deg,#d27b9b_0%,#e78274_28%,#f4905f_58%,#fcba63_100%)]" />
            )}
        </section>
    );
}
