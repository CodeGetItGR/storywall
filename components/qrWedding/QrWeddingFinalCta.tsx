import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { QrWeddingFinalCtaButton } from '@/components/qrWedding/QrWeddingFinalCtaButton';
import type { Locale } from '@/i18n/config';
import { QR_WEDDING_SECTION } from '@/lib/qrWeddingPage';

const IMAGE = '/landing/storywall-final-cta-wedding-santorini.webp';

// The newlyweds' photo beside a warm panel with the last call to create the wedding; stacked at 760px and narrower.
export async function QrWeddingFinalCta({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.finalCta' });
    const strong = (chunks: ReactNode) => <strong className="font-bold">{chunks}</strong>;

    return (
        <section
            aria-labelledby="qr-wedding-final-title"
            className="grid h-180 min-h-180 grid-cols-[44%_56%] overflow-hidden bg-[#f5ab62] text-[#151313] max-[761px]:block max-[761px]:h-auto max-[761px]:min-h-100"
            id={QR_WEDDING_SECTION.create}
        >
            {/* Photo */}
            <div className="group/photo h-180 min-h-180 min-w-0 overflow-hidden max-[761px]:h-[78vw] max-[761px]:max-h-125 max-[761px]:min-h-80">
                <ProtectedImage
                    alt={t('imageAlt')}
                    className="block h-180 min-h-180 w-full object-cover object-[50%_42%] contrast-[.98] saturate-[.96] transition-transform duration-1200 ease-[cubic-bezier(.22,.61,.36,1)] max-[761px]:h-full max-[761px]:min-h-0 max-[761px]:object-[50%_40%] min-[1001px]:group-hover/photo:scale-[1.025]"
                    height={1086}
                    sizes="(max-width: 760px) 100vw, 44vw"
                    src={IMAGE}
                    width={1448}
                />
            </div>

            {/* Call to action */}
            <div className="flex h-180 min-h-180 min-w-0 flex-col items-center justify-center bg-[radial-gradient(circle_at_84%_15%,rgba(255,255,255,.28),transparent_31%),linear-gradient(135deg,#ffc969_0%,#f9a462_48%,#f39a72_100%)] px-[7vw] pt-21.5 pb-19.5 text-center max-[761px]:h-auto max-[761px]:min-h-0 max-[761px]:px-5 max-[761px]:pt-10 max-[761px]:pb-11">
                <div aria-hidden="true" className="mb-10.5 flex size-14.5 items-center justify-center max-[761px]:mb-6 max-[761px]:size-12">
                    <svg
                        className="size-14 overflow-visible fill-none stroke-[#151313] stroke-[2.8] [stroke-linecap:round] [stroke-linejoin:round] max-[761px]:size-11.5"
                        viewBox="0 0 64 64"
                    >
                        <path d="M32 3C34.7 19.2 44.8 29.3 61 32C44.8 34.7 34.7 44.8 32 61C29.3 44.8 19.2 34.7 3 32C19.2 29.3 29.3 19.2 32 3Z" />
                        <path
                            className="stroke-[2.2] opacity-72"
                            d="M51 5C52.1 11.7 56.3 15.9 63 17C56.3 18.1 52.1 22.3 51 29C49.9 22.3 45.7 18.1 39 17C45.7 15.9 49.9 11.7 51 5Z"
                        />
                    </svg>
                </div>
                <div className="mb-6.5 font-[Arial,sans-serif] text-[9px] font-black tracking-[0.17em] max-[761px]:mb-3.5 max-[761px]:text-[13px]">
                    {t('kicker')}
                </div>
                <h2
                    className="m-0 mx-auto max-w-205 text-center [font-family:var(--editorial)] text-[clamp(72px,6.7vw,124px)] leading-[.78] font-normal tracking-[-0.065em] max-[761px]:text-[clamp(50px,14vw,70px)] max-[761px]:leading-[.82]"
                    id="qr-wedding-final-title"
                >
                    {t.rich('title', { br: () => <br />, strong })}
                </h2>
                <p className="mx-auto mt-8.5 max-w-140 text-center font-[Arial,sans-serif] text-base leading-[1.55] max-[761px]:mt-4.5 max-[761px]:max-w-[92%] max-[761px]:text-sm">
                    {t.rich('body', { strong })}
                </p>
                <QrWeddingFinalCtaButton>
                    {t.rich('cta', { strong: (chunks) => <strong className="font-black">{chunks}</strong> })}
                </QrWeddingFinalCtaButton>
            </div>
        </section>
    );
}
