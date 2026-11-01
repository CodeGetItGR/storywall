import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { QR_WEDDING_SECTION } from '@/lib/qrWeddingPage';

// A gradient band that fades into the white section below it, with a link down to the demo.
export async function QrWeddingDemoStrip({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.strip' });

    return (
        <section
            aria-label={t('label')}
            className="relative isolate z-20 min-h-43.5 w-full overflow-hidden bg-[linear-gradient(90deg,rgba(255,111,145,.6)_0%,rgba(255,143,111,.6)_28%,rgba(247,183,91,.6)_58%,rgba(248,210,92,.6)_100%)] text-[#151313] after:absolute after:inset-x-0 after:-bottom-px after:z-2 after:h-33.5 after:bg-[linear-gradient(rgba(255,255,255,0)_0%,rgba(255,255,255,.08)_20%,rgba(255,255,255,.28)_45%,rgba(255,255,255,.62)_72%,#fff_100%)] after:content-[''] max-[761px]:min-h-47 max-[761px]:after:h-34.75 max-[761px]:after:bg-[linear-gradient(rgba(255,255,255,0)_0%,rgba(255,255,255,.1)_22%,rgba(255,255,255,.34)_50%,rgba(255,255,255,.7)_76%,#fff_100%)]"
        >
            <div className="mx-auto flex min-h-43.5 w-[min(1500px,100%_-_120px)] items-start justify-center gap-7 pt-8.5 pb-15.5 max-[761px]:min-h-47 max-[761px]:w-[calc(100%_-_34px)] max-[761px]:gap-3.5 max-[761px]:pt-7 max-[761px]:pb-17.5">
                {/* Slogan */}
                <div className="m-0 text-center [font-family:var(--editorial)] text-[clamp(27px,2vw,42px)] leading-[1.04] font-normal tracking-[-0.035em] text-nowrap max-[761px]:max-w-[56%] max-[761px]:text-left max-[761px]:text-[23px] max-[761px]:tracking-[-0.03em] max-[761px]:text-wrap">
                    {t.rich('slogan', { strong: (chunks) => <strong className="font-bold">{chunks}</strong> })}
                </div>

                {/* Link to the demo */}
                <a
                    className="group relative z-3 -mt-1.5 inline-flex min-h-17 shrink-0 items-center gap-5.5 rounded-full bg-white pr-7 pl-8 text-[13px] font-black tracking-[0.13em] text-nowrap text-[#151313] transition-[transform,background] duration-280 ease-[ease] hover:-translate-y-px max-[761px]:-mt-1 max-[761px]:min-h-15.5 max-[761px]:gap-3 max-[761px]:pr-5 max-[761px]:pl-5.5 max-[761px]:text-[11px] max-[761px]:tracking-[0.11em]"
                    href={`#${QR_WEDDING_SECTION.demo}`}
                >
                    <span>{t('cta')}</span>
                    <span
                        aria-hidden="true"
                        className="text-[25px] leading-none transition-transform duration-280 ease-[ease] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 max-[761px]:text-[23px]"
                    >
                        ↗
                    </span>
                </a>
            </div>
        </section>
    );
}
