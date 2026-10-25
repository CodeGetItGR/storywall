import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { landingClickAttributes, landingSectionAttributes } from '@/lib/landingTracking';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const DEMO_BUTTON_CLASS =
    'group flex-none items-center justify-center rounded-full bg-white px-[22px] text-[10px] font-black tracking-[0.14em] text-[#151313] uppercase shadow-[0_10px_28px_rgba(21,19,19,0.1)] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-[3px] hover:shadow-[0_14px_34px_rgba(21,19,19,0.15)]';

type LandingDemoProps = {
    // An occasion page's server-rendered preview under the band.
    children?: ReactNode;
    // An occasion page's own sentence in place of the landing's; may hold bold words.
    copy?: ReactNode;
    // true: the landing's eyebrow in its own column. false: no eyebrow, the heading starts on the left.
    // A string: that kicker right above the heading, keeping the three columns.
    eyebrow?: boolean | string;
    heading?: string[];
    href?: string;
    // Drawn phones in place of the landing's picture, announced as one image named previewLabel.
    phones?: ReactNode;
    previewLabel?: string;
};

export async function LandingDemo({
    children,
    copy,
    eyebrow = true,
    heading: headingOverride,
    href = routes.demo,
    phones,
    previewLabel,
}: LandingDemoProps) {
    const t = await getTranslations('LandingPage.demo');
    const heading = headingOverride ?? (t.raw('heading') as string[]);
    const kicker = typeof eyebrow === 'string' ? eyebrow : null;

    return (
        <section
            className={cn(
                'block overflow-hidden bg-[radial-gradient(circle_at_84%_66%,rgba(242,145,77,0.3)_0%,rgba(242,145,77,0.2)_16%,rgba(242,145,77,0.08)_30%,transparent_46%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.34),transparent_34%),linear-gradient(135deg,#f7d9a8_0%,#f8d08f_26%,#f8c87f_52%,#f6be79_76%,#f4b879_100%)] px-5 pt-[58px] pb-[60px] text-[#151313] min-[761px]:grid min-[761px]:items-center min-[761px]:gap-[3vw] min-[761px]:px-[5vw] min-[761px]:pt-[68px] min-[761px]:pb-[74px]',
                eyebrow !== false ? 'min-[761px]:grid-cols-[0.5fr_1.42fr_0.92fr]' : 'min-[761px]:grid-cols-[1.42fr_0.92fr]',
            )}
            id="demo"
            {...landingSectionAttributes('demo')}
        >
            {/* Eyebrow */}
            {eyebrow === true ? (
                <div className="pt-3 text-[10px] font-black tracking-[0.15em] uppercase min-[761px]:col-start-1 min-[761px]:row-start-1 min-[761px]:mt-3 min-[761px]:self-start min-[761px]:pt-0">
                    {t('eyebrow')}
                </div>
            ) : null}
            {/* Kicker, over the heading */}
            {kicker ? (
                <div className="pt-3 text-[10px] font-black tracking-[0.15em] uppercase min-[761px]:col-start-2 min-[761px]:row-start-1 min-[761px]:mb-4 min-[761px]:self-end min-[761px]:pt-0 min-[761px]:text-[13px]">
                    {kicker}
                </div>
            ) : null}
            {/* Heading and link */}
            <div
                className={cn(
                    'min-[761px]:self-center',
                    kicker
                        ? 'min-[761px]:col-start-2 min-[761px]:row-start-2 min-[761px]:self-start'
                        : eyebrow
                          ? 'min-[761px]:col-start-2 min-[761px]:row-start-1'
                          : 'min-[761px]:col-start-1 min-[761px]:row-start-1',
                )}
            >
                <h2 className="m-0 mt-6 [font-family:var(--editorial)] text-[clamp(42px,10.5vw,58px)] leading-[0.98] font-normal tracking-[-0.055em] min-[761px]:mt-0 min-[761px]:max-w-[720px] min-[761px]:text-[clamp(54px,4.5vw,86px)] min-[761px]:leading-[0.96]">
                    {heading[0]}
                    <br />
                    <strong className="font-bold">{heading[1]}</strong>
                </h2>
                <div className="mt-[26px] block border-t border-[#151313]/18 pt-6 min-[761px]:mt-[34px] min-[761px]:flex min-[761px]:flex-col min-[761px]:items-start min-[761px]:gap-[22px] min-[761px]:pt-[26px]">
                    <p className="m-0 max-w-[92%] text-[18px] leading-[1.5] text-[#151313] min-[761px]:max-w-[760px] min-[761px]:text-[clamp(22px,1.4vw,28px)] min-[761px]:leading-[1.45]">
                        {copy ?? (
                            <>
                                {t('copyStart')} <strong>{t('copyDemo')}</strong> {t('copyMiddle')} <strong>{t('copyBrand')}</strong>
                                <br />
                                {t('copyEnd')}
                            </>
                        )}
                    </p>
                    <a
                        aria-label={t('cta')}
                        className={`${DEMO_BUTTON_CLASS} hidden min-h-[68px] pr-[30px] pl-[34px] text-[12px] tracking-[0.14em] min-[761px]:inline-flex min-[761px]:gap-6`}
                        href={href}
                        {...landingClickAttributes({ event: 'demo', placement: 'demo' })}
                    >
                        <span>{t('button')}</span>
                        <span
                            aria-hidden="true"
                            className="text-2xl leading-none transition-transform duration-300 ease-out group-hover:translate-x-[3px] group-hover:-translate-y-[3px]"
                        >
                            ↗
                        </span>
                    </a>
                </div>
            </div>
            {/* Phones */}
            <div
                aria-label={previewLabel ?? t('previewLabel')}
                className={cn(
                    'flex items-center justify-center min-[761px]:col-start-[-2] min-[761px]:self-center min-[761px]:justify-self-end min-[761px]:pr-2',
                    kicker ? 'min-[761px]:row-[1/span_2]' : 'min-[761px]:row-start-1',
                )}
                role={phones ? 'img' : undefined}
            >
                {phones ?? (
                    <ProtectedImage
                        unoptimized
                        alt={t('imageAlt')}
                        className="block h-auto w-[min(620px,118vw)] max-w-none translate-x-[-2vw] object-contain drop-shadow-[-16px_30px_32px_rgba(70,38,24,0.2)] min-[761px]:w-[min(720px,37vw)] min-[761px]:translate-x-0 min-[761px]:translate-y-[10px] min-[761px]:drop-shadow-[-12px_24px_26px_rgba(70,38,24,0.2)]"
                        height={1120}
                        src="/landing/storywall-demo-preview-with-two-angled-smartphones-showing-the-a.webp"
                        loading="lazy"
                        width={1115}
                    />
                )}
            </div>
            <a
                aria-label={t('cta')}
                className={`${DEMO_BUTTON_CLASS} mt-[26px] flex min-h-[70px] w-full gap-[22px] text-[12px] min-[761px]:hidden`}
                href={href}
                {...landingClickAttributes({ event: 'demo', placement: 'demo' })}
            >
                <span>{t('button')}</span>
                <span
                    aria-hidden="true"
                    className="text-[23px] leading-none transition-transform duration-300 ease-out group-hover:translate-x-[3px] group-hover:-translate-y-[3px]"
                >
                    ↗
                </span>
            </a>
            {/* Preview */}
            {children ? <div className="min-[761px]:col-span-full">{children}</div> : null}
        </section>
    );
}
