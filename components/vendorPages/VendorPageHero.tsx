import { getLocale, getTranslations } from 'next-intl/server';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { BODY, PRIMARY_BUTTON } from '@/components/forBusiness/forBusinessStyles';
import { GradientIcon } from '@/components/vendorPages/GradientIcon';
import { TYPE_ICONS } from '@/components/vendorPages/vendorPageIcons';
import { GRADIENT_TEXT } from '@/components/vendorPages/vendorPageStyles';
import type { Locale } from '@/i18n/config';
import { getForBusinessPath, type VendorPageType } from '@/i18n/publicLocale';
import { VENDOR_PAGES } from '@/lib/vendorPages';

const FLOAT_CARD = 'absolute flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-sm shadow-[0_18px_40px_-18px_rgba(21,19,19,0.45)] backdrop-blur';

export async function VendorPageHero({ type }: { type: VendorPageType }) {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('VendorPages');
    const copy = (key: string) => t(`types.${type}.${key}`);

    return (
        /* Hero */
        <section className="bg-[radial-gradient(circle_at_88%_8%,rgba(248,165,96,0.2),transparent_42%),radial-gradient(circle_at_6%_92%,rgba(210,123,155,0.16),transparent_44%)] px-5 pt-6 pb-16 min-[761px]:px-[clamp(24px,7vw,120px)] min-[761px]:pt-10 min-[761px]:pb-24">
            <div className="mx-auto grid w-full max-w-295 items-center gap-12 min-[1000px]:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] min-[1000px]:gap-16">
                <div className="min-w-0">
                    {/* Breadcrumb */}
                    <nav aria-label={t('breadcrumb')} className="mb-6 text-sm">
                        <a href={getForBusinessPath(locale)} className="font-semibold text-[#151313]/70 underline! underline-offset-4 hover:opacity-70">
                            {t('breadcrumb')}
                        </a>
                        <span aria-hidden="true" className="mx-2 text-[#151313]/40">
                            ›
                        </span>
                        <span aria-current="page">{copy('label')}</span>
                    </nav>
                    {/* Heading */}
                    <h1 className="m-0 [font-family:var(--editorial)] text-[44px] leading-[0.95] font-normal tracking-[-0.05em] text-balance min-[761px]:text-[clamp(56px,5.6vw,88px)]">
                        {copy('h1.plain')} <span className={GRADIENT_TEXT}>{copy('h1.grad')}</span>
                    </h1>
                    <p className={`mt-6 max-w-[50ch] ${BODY}`}>{copy('lede')}</p>
                    {/* Action */}
                    <a href="#apply" className={`${PRIMARY_BUTTON} mt-8`}>
                        {t('heroCta')}
                    </a>
                </div>
                {/* Photo */}
                <figure className="relative m-0 mx-auto w-full max-w-130 pb-8 min-[1000px]:max-w-none">
                    <ProtectedImage
                        priority
                        alt={copy('imageAlt')}
                        className="aspect-[4/5] w-full rounded-[28px] object-cover min-[761px]:rounded-[36px]"
                        height={1000}
                        sizes="(min-width: 1000px) 45vw, 100vw"
                        src={VENDOR_PAGES[type].heroImage}
                        width={800}
                    />
                    <ProtectedImage
                        alt={t('reactionAlt.love')}
                        className="absolute -top-5 right-6 size-16! rotate-6 min-[761px]:size-20!"
                        height={160}
                        src="/landing/heart-eyes-reaction.webp"
                        width={160}
                    />
                    <ProtectedImage
                        alt={t('reactionAlt.cheers')}
                        className="absolute top-1/3 -left-3 size-14! -rotate-6 min-[761px]:-left-6 min-[761px]:size-16!"
                        height={160}
                        src="/landing/champagne-reaction.webp"
                        width={160}
                    />
                    {/* What the page is about */}
                    <div className={`${FLOAT_CARD} right-4 bottom-20 min-[761px]:-right-4`}>
                        <GradientIcon icon={TYPE_ICONS[type]} className="size-6" />
                        <div className="leading-tight">
                            <small className="block text-xs text-[#151313]/60">{copy('tag.label')}</small>
                            <span className="font-semibold">{copy('tag.value')}</span>
                        </div>
                    </div>
                    {/* The vendor in the event */}
                    <div className={`${FLOAT_CARD} bottom-0 left-4 min-[761px]:-left-4`}>
                        <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full [background-image:var(--brand-gradient)] font-bold text-white">
                            {t('business').charAt(0)}
                        </span>
                        <div className="leading-tight">
                            <span className="block font-semibold">{t('business')}</span>
                            <span className="mt-1 inline-block rounded-full bg-[#151313]/[0.06] px-2 py-0.5 text-xs font-semibold">{copy('linkLabel')}</span>
                        </div>
                    </div>
                </figure>
            </div>
        </section>
    );
}
