import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { QR_GRADIENT_TEXT, QR_PANEL, QR_PANEL_TINT } from '@/components/qrWedding/qrWeddingClasses';
import type { Locale } from '@/i18n/config';
import { QR_WEDDING_MEDIA, QR_WEDDING_SECTION } from '@/lib/qrWeddingPage';
import { cn } from '@/lib/utils';

type Item = { time: string; title: string; body: string; alt: string };

// One photo per moment of the day. "up" photos sit above the line, the others below it.
const PHOTOS = [
    { file: 'timeline-getting-ready', width: 798, height: 1000, up: true },
    { file: 'timeline-father-hug', width: 1000, height: 754, up: false },
    { file: 'timeline-ceremony', width: 805, height: 1000, up: true },
    { file: 'timeline-confetti-exit', width: 798, height: 1000, up: false },
    { file: 'timeline-morning-after', width: 723, height: 1000, up: true },
];

const GRADIENT_STRONG = (chunks: ReactNode) => <strong className={`font-normal ${QR_GRADIENT_TEXT}`}>{chunks}</strong>;

// The wedding day as a dotted line of polaroids, photos alternating above and below it; a vertical
// line with the photo beside its text at 760px and narrower.
export async function QrWeddingTimeline({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.timeline' });
    const items = t.raw('items') as Item[];
    const lastIndex = PHOTOS.length - 1;

    return (
        <section aria-labelledby="qr-wedding-timeline-title" className="bg-white py-10" id={QR_WEDDING_SECTION.timeline}>
            <div className={cn(QR_PANEL, QR_PANEL_TINT, 'px-10 pt-16 pb-14 max-[761px]:px-4 max-[761px]:pt-10 max-[761px]:pb-7.5')}>
                {/* Heading */}
                <div className="mx-auto mb-11 max-w-225 text-center max-[761px]:mb-7.5">
                    <div className="mb-4 font-[Arial,sans-serif] text-[11px] font-bold tracking-[0.2em] text-[#ff765f]">{t('kicker')}</div>
                    <h2
                        className="m-0 [font-family:var(--editorial)] text-[clamp(34px,4.2vw,60px)] leading-[1.04] font-normal tracking-[-0.04em] text-[#151313]"
                        id="qr-wedding-timeline-title"
                    >
                        {t.rich('title', { br: () => <br />, strong: GRADIENT_STRONG })}
                    </h2>
                </div>

                {/* Timeline */}
                <div className="relative grid grid-cols-5 gap-4.5 py-2.5 before:absolute before:inset-x-0 before:top-71 before:h-0.5 before:bg-[repeating-linear-gradient(90deg,#f0a08a_0_8px,transparent_8px_14px)] before:content-[''] max-[761px]:grid-cols-1 max-[761px]:gap-6.5 max-[761px]:py-0 max-[761px]:pl-5.5 max-[761px]:before:top-0 max-[761px]:before:right-auto max-[761px]:before:bottom-0 max-[761px]:before:left-1.5 max-[761px]:before:h-auto max-[761px]:before:w-0.5 max-[761px]:before:bg-[repeating-linear-gradient(180deg,#f0a08a_0_8px,transparent_8px_14px)]">
                    {PHOTOS.map((photo, index) => {
                        const item = items[index];
                        const last = index === lastIndex;
                        return (
                            <article
                                className={cn(
                                    'relative grid grid-rows-[260px_30px_200px] items-center justify-items-center text-center max-[761px]:grid-cols-[118px_1fr] max-[761px]:grid-rows-none max-[761px]:justify-items-start max-[761px]:gap-3.5 max-[761px]:text-left',
                                    last && 'max-[761px]:mt-5.5',
                                )}
                                key={photo.file}
                            >
                                {/* Photo */}
                                <div
                                    className={cn(
                                        'relative w-42.5 rounded-md bg-white px-2.25 pt-2.25 pb-7.5 shadow-[0_14px_28px_rgba(60,40,25,.18)] max-[761px]:col-start-1 max-[761px]:row-start-1 max-[761px]:w-29.5 max-[761px]:self-center max-[761px]:px-1.5 max-[761px]:pt-1.5 max-[761px]:pb-5',
                                        photo.up
                                            ? 'row-start-1 -rotate-4 self-end max-[761px]:-rotate-3'
                                            : 'row-start-3 rotate-4 self-start max-[761px]:rotate-3',
                                    )}
                                >
                                    <ProtectedImage
                                        alt={item.alt}
                                        className="block aspect-square h-auto w-full rounded-[3px] object-cover"
                                        height={photo.height}
                                        sizes="170px"
                                        src={`${QR_WEDDING_MEDIA}/${photo.file}.webp`}
                                        width={photo.width}
                                    />
                                    {last && (
                                        <span className="absolute -top-14.5 left-1/2 -translate-x-1/2 -rotate-4 rounded-full bg-(image:--brand-gradient) px-3.5 py-1.75 font-[Arial,sans-serif] text-[11px] font-bold tracking-[0.08em] whitespace-nowrap text-white uppercase shadow-[0_8px_18px_rgba(231,130,116,.35)] max-[761px]:-top-7.5 max-[761px]:px-2.5 max-[761px]:py-1.25 max-[761px]:text-[9.5px]">
                                            {t('badge')}
                                        </span>
                                    )}
                                </div>

                                {/* Dot on the line */}
                                <i
                                    aria-hidden="true"
                                    className={cn(
                                        'row-start-2 size-3.5 rounded-full shadow-[0_0_0_6px_#fff] max-[761px]:absolute max-[761px]:top-1/2 max-[761px]:row-start-auto',
                                        last
                                            ? 'bg-(image:--brand-gradient) max-[761px]:-left-6.25 max-[761px]:-mt-2.5'
                                            : 'bg-[#ff765f] max-[761px]:-left-5.5 max-[761px]:-mt-1.75',
                                    )}
                                />

                                {/* Text */}
                                <div
                                    className={cn(
                                        'max-[761px]:col-start-2 max-[761px]:row-start-1 max-[761px]:self-center',
                                        photo.up ? 'row-start-3 self-start' : 'row-start-1 self-end',
                                    )}
                                >
                                    <span className="mb-1.5 block font-[Arial,sans-serif] text-xs leading-[normal] font-bold tracking-[0.04em] text-[#ff765f]">
                                        {item.time}
                                    </span>
                                    <h3
                                        className={cn(
                                            'm-0 mb-1.5 [font-family:var(--editorial)] text-[23px] leading-[1.1] font-normal tracking-[-0.02em] text-[#151313] max-[761px]:text-xl',
                                            last && 'font-bold',
                                        )}
                                    >
                                        {item.title}
                                    </h3>
                                    <p className="m-0 font-[Arial,sans-serif] text-sm leading-[1.45] text-[#6f6a64] max-[761px]:text-[13px]">
                                        {item.body}
                                    </p>
                                </div>
                            </article>
                        );
                    })}
                </div>

                {/* The morning after */}
                <div className="mx-auto mt-11.5 max-w-190 rounded-3xl bg-white px-7 py-7.5 text-center shadow-[0_14px_30px_rgba(60,40,25,.1)] max-[761px]:mt-8 max-[761px]:px-4.5 max-[761px]:py-6">
                    <h3 className="m-0 mb-2.5 [font-family:var(--editorial)] text-[clamp(26px,2.6vw,38px)] leading-[1.1] font-normal tracking-[-0.03em] text-[#151313]">
                        {t.rich('nextTitle', { br: () => <br />, strong: GRADIENT_STRONG })}
                    </h3>
                    <p className="m-0 font-[Arial,sans-serif] text-[15px] leading-[1.45] text-[#6f6a64] max-[761px]:text-[13px]">{t('nextBody')}</p>
                </div>
            </div>
        </section>
    );
}
