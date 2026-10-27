import { getTranslations } from 'next-intl/server';

import { GradientIcon } from '@/components/occasions/wedding/mock/GradientIcon';
import { WeddingSectionHead } from '@/components/occasions/wedding/WeddingSectionHead';
import { WeddingWrap } from '@/components/occasions/wedding/WeddingWrap';
import type { Locale } from '@/i18n/config';
import type { WeddingCardCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_PRIVATE_ICONS } from '@/lib/occasions/weddingFeatures';

// "Only for guests": four numbered cards on what keeps the wedding's social private.
export async function WeddingPrivate({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.WEDDING.private' });
    const cards = t.raw('cards') as WeddingCardCopy[];

    return (
        <section
            aria-labelledby="wedding-private-title"
            className="bg-white pt-17.5 pb-20 font-[Arial,Helvetica,sans-serif] text-[#151313] min-[561px]:pt-25 min-[561px]:pb-27.5"
        >
            <WeddingWrap>
                {/* Heading */}
                <WeddingSectionHead
                    className="mb-9 max-w-225 min-[561px]:mb-15"
                    heading={t.raw('heading') as [string, string]}
                    headingClassName="text-[clamp(40px,4.4vw,72px)] leading-[0.95] tracking-[-0.05em]"
                    id="wedding-private-title"
                    kicker={t('kicker')}
                >
                    <p className="mx-auto mt-5.5 mb-0 max-w-160 font-[Georgia,serif] text-[clamp(17px,1.3vw,20px)] leading-[1.45] text-[#151313]/78">
                        {t('intro')}
                    </p>
                </WeddingSectionHead>
                {/* Cards */}
                <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 min-[561px]:gap-4.5 min-[601px]:grid-cols-2 min-[1001px]:grid-cols-4">
                    {cards.map((card, index) => (
                        <li
                            className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#fbedf1_0%,#fcefea_40%,#fdf1e8_70%,#fef5e9_100%)] px-6.5 pt-7.5 pb-8.5"
                            key={card.title}
                        >
                            <span
                                aria-hidden="true"
                                className="absolute top-1.5 right-4.5 [background-image:var(--brand-gradient)] bg-clip-text [font-family:var(--editorial)] text-[72px] leading-none text-transparent opacity-90 min-[561px]:text-[92px]"
                            >
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            {/* A filter on a masked element is masked away, so the shadow is on a wrapper */}
                            <span className="mb-6 block w-fit drop-shadow-[0_4px_8px_rgba(230,126,105,0.14)]">
                                <GradientIcon className="size-14" src={WEDDING_PRIVATE_ICONS[index]!} />
                            </span>
                            <h3 className="relative mt-0 mb-2.5 [font-family:var(--editorial)] text-[clamp(24px,1.9vw,29px)] leading-[1.05] font-normal tracking-[-0.035em]">
                                {card.title}
                            </h3>
                            <p className="relative m-0 text-[15px] leading-[1.55] text-[#151313]/74">{card.body}</p>
                        </li>
                    ))}
                </ul>
            </WeddingWrap>
        </section>
    );
}
