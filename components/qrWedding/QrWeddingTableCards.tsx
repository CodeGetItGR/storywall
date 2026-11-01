import { getTranslations } from 'next-intl/server';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { QrWeddingCheck } from '@/components/qrWedding/QrWeddingCheck';
import { QR_GRADIENT_TEXT, QR_PANEL, QR_PANEL_TINT } from '@/components/qrWedding/qrWeddingClasses';
import type { Locale } from '@/i18n/config';
import { QR_WEDDING_MEDIA, QR_WEDDING_SECTION } from '@/lib/qrWeddingPage';
import { cn } from '@/lib/utils';

// The card designs, fanned out left to right. Each image has the card's text in the page's language.
const CARDS = [
    { file: 'table-card-gold-roses', width: 600, height: 851, className: '-rotate-9 translate-y-7.5' },
    { file: 'table-card-gold-frame', width: 600, height: 851, className: '-rotate-4 translate-y-2 z-2' },
    { file: 'table-card-olive-branch', width: 599, height: 854, className: 'rotate-0 -translate-y-1 z-3' },
    { file: 'table-card-pampas', width: 600, height: 855, className: 'rotate-4 translate-y-2 z-2' },
    { file: 'table-card-blue-flowers', width: 600, height: 856, className: 'rotate-9 translate-y-7.5' },
];

// The printable QR card designs as a fan; a swipeable row at 760px and narrower.
export async function QrWeddingTableCards({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.cards' });
    const alts = t.raw('alts') as string[];

    return (
        <section aria-labelledby="qr-wedding-cards-title" className="bg-white pt-5.5 pb-15" id={QR_WEDDING_SECTION.cards}>
            <div
                className={cn(
                    QR_PANEL,
                    QR_PANEL_TINT,
                    'overflow-hidden px-[clamp(16px,3vw,44px)] pt-[clamp(40px,5vw,70px)] pb-[clamp(34px,4vw,54px)] max-[761px]:px-0 max-[761px]:pt-9.5 max-[761px]:pb-7.5',
                )}
            >
                {/* Heading */}
                <div className="mx-auto mb-[clamp(30px,4vw,50px)] max-w-205 text-center max-[761px]:px-4">
                    <div className="mb-4 font-[Arial,sans-serif] text-[11px] font-bold tracking-[0.2em] text-[#ff765f]">{t('kicker')}</div>
                    <h2
                        className="m-0 [font-family:var(--editorial)] text-[clamp(34px,4.2vw,60px)] leading-[1.04] font-normal tracking-[-0.04em] text-[#151313]"
                        id="qr-wedding-cards-title"
                    >
                        {t('title')}
                        <span className={`mx-auto block w-fit pb-[.08em] ${QR_GRADIENT_TEXT}`}>{t('titleSub')}</span>
                    </h2>
                    <p className="mx-auto mt-5 max-w-155 font-[Arial,sans-serif] text-[clamp(16px,1.4vw,18px)] leading-[1.55] text-[#6f6a64]">
                        {t('body')}
                    </p>
                </div>

                {/* Card designs */}
                <div className="flex items-end justify-center pt-2.5 pb-8.5 max-[761px]:snap-x max-[761px]:snap-mandatory max-[761px]:justify-start max-[761px]:gap-3.5 max-[761px]:overflow-x-auto max-[761px]:px-4 max-[761px]:pt-4 max-[761px]:pb-11">
                    {CARDS.map((card, index) => (
                        <figure
                            className={cn(
                                'mx-[-1.2%] my-0 w-[21%] flex-none shadow-[0_20px_40px_rgba(60,40,25,.18)] max-[761px]:mx-0 max-[761px]:w-[62%] max-[761px]:transform-none max-[761px]:snap-center max-[761px]:shadow-[0_8px_16px_rgba(60,40,25,.13)]',
                                card.className,
                            )}
                            key={card.file}
                        >
                            <ProtectedImage
                                alt={alts[index]}
                                className="block h-auto w-full"
                                height={card.height}
                                sizes="(max-width: 760px) 62vw, 260px"
                                src={`${QR_WEDDING_MEDIA}/${card.file}-${locale}.webp`}
                                width={card.width}
                            />
                        </figure>
                    ))}
                </div>

                {/* What the card gives you */}
                <ul className="mx-auto mt-[clamp(26px,3vw,40px)] flex list-none flex-wrap justify-center gap-x-7 gap-y-2.5 p-0 max-[761px]:flex-col max-[761px]:items-start max-[761px]:gap-x-2.5 max-[761px]:px-4">
                    {(t.raw('checks') as string[]).map((check) => (
                        <li className="flex items-center gap-2.5 font-[Arial,sans-serif] text-[15px] leading-[1.4] text-[#151313]" key={check}>
                            <QrWeddingCheck className="size-7 bg-[#e4f0e1]" iconClassName="size-3.5" />
                            <span>{check}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
