import { getTranslations } from 'next-intl/server';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { routes } from '@/lib/routes';

export async function LandingFinalCta() {
    const t = await getTranslations('LandingPage.finalCta');
    const heading = t.raw('heading') as string[];

    return (
        <section
            className="group block min-h-100 overflow-hidden bg-[#f5ab62] text-[#151313] min-[761px]:grid min-[761px]:min-h-0 min-[761px]:max-h-none min-[761px]:grid-cols-[44%_56%]"
            id="create"
        >
            <div className="h-[78vw] min-h-80 overflow-hidden min-[761px]:h-180 min-[761px]:min-h-0">
                <ProtectedImage
                    alt={t('imageAlt')}
                    data-filename="storywall-final-cta-wedding-santorini.webp"
                    src="/landing/storywall-final-cta-wedding-santorini.webp"
                    width={1448}
                    height={1086}
                    loading="lazy"
                    sizes="(max-width: 760px) 100vw, 44vw"
                    className="block h-full w-full object-cover object-[50%_40%] saturate-[.96] contrast-[.98] transition-transform duration-1200 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.025] motion-reduce:transition-none min-[761px]:object-[50%_42%]"
                />
            </div>
            <div className="flex flex-col justify-center bg-[radial-gradient(circle_at_84%_15%,rgba(255,255,255,0.28),rgba(0,0,0,0)_31%),linear-gradient(135deg,#ffc969_0%,#f9a462_48%,#f39a72_100%)] px-5 pt-10 pb-11 min-[761px]:box-border min-[761px]:h-180 min-[761px]:px-[7vw]">
                <div aria-hidden="true" className="mb-6 flex size-12 items-center justify-center min-[761px]:mb-10.5 min-[761px]:size-14.5">
                    <svg
                        className="size-11.5 overflow-visible fill-none stroke-[#151313] [stroke-linecap:round] [stroke-linejoin:round] stroke-[2.8] min-[761px]:size-14"
                        role="presentation"
                        viewBox="0 0 64 64"
                    >
                        <path d="M32 3C34.7 19.2 44.8 29.3 61 32C44.8 34.7 34.7 44.8 32 61C29.3 44.8 19.2 34.7 3 32C19.2 29.3 29.3 19.2 32 3Z" />
                        <path
                            className="opacity-[0.72] stroke-[2.2]"
                            d="M51 5C52.1 11.7 56.3 15.9 63 17C56.3 18.1 52.1 22.3 51 29C49.9 22.3 45.7 18.1 39 17C45.7 15.9 49.9 11.7 51 5Z"
                        />
                    </svg>
                </div>
                <div className="mb-3.5 text-[13px] font-black tracking-[0.17em] min-[761px]:mb-6.5 min-[761px]:text-[9px]">{t('eyebrow')}</div>
                <h2 className="m-0 max-w-205 text-[clamp(50px,14vw,70px)] leading-[0.82] font-normal tracking-[-0.065em] [font-family:var(--editorial)] min-[761px]:text-[clamp(72px,6.7vw,124px)] min-[761px]:leading-[0.78]">
                    {heading[0]}
                    <br />
                    <strong className="font-bold">{heading[1]}</strong>
                </h2>
                <p className="mt-4.5 max-w-[92%] text-sm leading-[1.55] text-[#151313] min-[761px]:mt-8.5 min-[761px]:max-w-140 min-[761px]:text-base">
                    {t('copyStart')} <strong className="font-bold">{t('copyStrong')}</strong>
                </p>
                <a
                    className="motion-final-cta-btn mt-7 flex min-h-15 w-full items-center justify-between gap-7.5 rounded-full bg-white pr-5 pl-5.5 text-[11px] font-black tracking-[0.08em] text-[#151313] uppercase no-underline shadow-[0_12px_34px_rgba(21,19,19,0.1)] transition-transform duration-280 ease-[ease] hover:-translate-y-0.5 motion-reduce:transition-none min-[761px]:mt-8.5 min-[761px]:min-h-14.5 min-[761px]:w-max min-[761px]:justify-center min-[761px]:px-5.5 min-[761px]:text-[13px] min-[761px]:tracking-widest min-[761px]:shadow-none"
                    href={routes.register}
                >
                    <span>{t('cta')}</span>
                    <span className="motion-final-cta-arrow inline-block text-[22px] transition-transform duration-280 ease-[ease] group-hover:translate-x-0.75 group-hover:-translate-y-0.75 min-[761px]:inline-flex min-[761px]:items-center min-[761px]:justify-center min-[761px]:text-[21px] min-[761px]:leading-none">
                        ↗
                    </span>
                </a>
            </div>
        </section>
    );
}
