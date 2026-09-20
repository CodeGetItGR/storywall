import { getTranslations } from 'next-intl/server';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { routes } from '@/lib/routes';

const DEMO_BUTTON_CLASS =
    'group flex-none items-center justify-center rounded-full bg-white px-[22px] text-[10px] font-black tracking-[0.14em] text-[#151313] uppercase shadow-[0_10px_28px_rgba(21,19,19,0.1)] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-[3px] hover:shadow-[0_14px_34px_rgba(21,19,19,0.15)]';

export async function LandingDemo() {
    const t = await getTranslations('LandingPage.demo');
    const heading = t.raw('heading') as string[];

    return (
        <section
            className="block overflow-hidden bg-[radial-gradient(circle_at_84%_66%,rgba(242,145,77,0.3)_0%,rgba(242,145,77,0.2)_16%,rgba(242,145,77,0.08)_30%,transparent_46%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.34),transparent_34%),linear-gradient(135deg,#f7d9a8_0%,#f8d08f_26%,#f8c87f_52%,#f6be79_76%,#f4b879_100%)] pt-[58px] px-5 pb-[60px] text-[#151313] min-[761px]:grid min-[761px]:grid-cols-[0.5fr_1.42fr_0.92fr] min-[761px]:items-center min-[761px]:gap-[3vw] min-[761px]:pt-[68px] min-[761px]:px-[5vw] min-[761px]:pb-[74px]"
            id="demo"
        >
            <div className="pt-3 text-[10px] font-black tracking-[0.15em] uppercase min-[761px]:col-start-1 min-[761px]:row-start-1 min-[761px]:mt-3 min-[761px]:self-start min-[761px]:pt-0">
                {t('eyebrow')}
            </div>
            <div className="min-[761px]:col-start-2 min-[761px]:row-start-1 min-[761px]:self-center">
                <h2 className="m-0 mt-6 text-[clamp(42px,10.5vw,58px)] leading-[0.98] font-normal tracking-[-0.055em] [font-family:var(--editorial)] min-[761px]:mt-0 min-[761px]:max-w-[720px] min-[761px]:text-[clamp(54px,4.5vw,86px)] min-[761px]:leading-[0.96]">
                    {heading[0]}
                    <br />
                    <strong className="font-bold">{heading[1]}</strong>
                </h2>
                <div className="mt-[26px] block border-t border-[#151313]/18 pt-6 min-[761px]:mt-[34px] min-[761px]:flex min-[761px]:flex-col min-[761px]:items-start min-[761px]:gap-[22px] min-[761px]:pt-[26px]">
                    <p className="m-0 max-w-[92%] text-[18px] leading-[1.5] text-[#151313] min-[761px]:max-w-[760px] min-[761px]:text-[clamp(22px,1.4vw,28px)] min-[761px]:leading-[1.45]">
                        {t('copyStart')} <strong>{t('copyDemo')}</strong> {t('copyMiddle')} <strong>{t('copyBrand')}</strong>
                        <br />
                        {t('copyEnd')}
                    </p>
                    <a
                        aria-label={t('cta')}
                        className={`${DEMO_BUTTON_CLASS} hidden min-h-[68px] pr-[30px] pl-[34px] text-[12px] tracking-[0.14em] min-[761px]:inline-flex min-[761px]:gap-6`}
                        href={routes.demo}
                    >
                        <span>{t('button')}</span>
                        <span className="text-2xl leading-none transition-transform duration-300 ease-out group-hover:translate-x-[3px] group-hover:-translate-y-[3px]">
                            ↗
                        </span>
                    </a>
                </div>
            </div>
            <div
                aria-label={t('previewLabel')}
                className="flex items-center justify-center min-[761px]:col-start-3 min-[761px]:row-start-1 min-[761px]:justify-self-end min-[761px]:self-center min-[761px]:pr-2"
            >
                <ProtectedImage
                    alt={t('imageAlt')}
                    className="block h-auto w-[min(620px,118vw)] max-w-none translate-x-[-2vw] object-contain drop-shadow-[-16px_30px_32px_rgba(70,38,24,0.2)] min-[761px]:w-[min(720px,37vw)] min-[761px]:translate-x-0 min-[761px]:translate-y-[10px] min-[761px]:drop-shadow-[-12px_24px_26px_rgba(70,38,24,0.2)]"
                    height={1120}
                    src="/landing/storywall-demo-preview-with-two-angled-smartphones-showing-the-a.webp"
                    loading="lazy"
                    sizes="(max-width: 760px) 118vw, 37vw"
                    width={1115}
                />
            </div>
            <a
                aria-label={t('cta')}
                className={`${DEMO_BUTTON_CLASS} mt-[26px] flex min-h-[70px] w-full gap-[22px] text-[12px] min-[761px]:hidden`}
                href={routes.demo}
            >
                <span>{t('button')}</span>
                <span className="text-[23px] leading-none transition-transform duration-300 ease-out group-hover:translate-x-[3px] group-hover:-translate-y-[3px]">
                    ↗
                </span>
            </a>
        </section>
    );
}
