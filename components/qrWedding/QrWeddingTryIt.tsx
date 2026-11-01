import { getTranslations } from 'next-intl/server';

import { QrWeddingCheck } from '@/components/qrWedding/QrWeddingCheck';
import { QR_GRADIENT_TEXT, QR_PANEL } from '@/components/qrWedding/qrWeddingClasses';
import { QrWeddingQrCode } from '@/components/qrWedding/QrWeddingQrCode';
import type { Locale } from '@/i18n/config';
import { QR_WEDDING_SECTION, QR_WEDDING_UPLOAD_HREF } from '@/lib/qrWeddingPage';
import { cn } from '@/lib/utils';

// A sample QR code to scan beside the copy. At 760px and narrower the text column dissolves so the
// heading, QR code, copy, ticks and a button stack in that order, centered.
export async function QrWeddingTryIt({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.tryIt' });

    return (
        <section aria-labelledby="qr-wedding-try-title" className="bg-white pt-5.5 pb-15" id={QR_WEDDING_SECTION.tryIt}>
            <div
                className={cn(
                    QR_PANEL,
                    'grid grid-cols-[auto_1fr] items-center gap-[clamp(36px,5vw,80px)] bg-[linear-gradient(110deg,rgba(255,179,184,.5)_0%,rgba(251,185,160,.5)_35%,rgba(248,207,150,.5)_70%,rgba(247,223,156,.5)_100%)] px-[clamp(32px,6vw,90px)] py-[clamp(40px,5vw,64px)] text-[#151313] max-[761px]:flex max-[761px]:flex-col max-[761px]:gap-0 max-[761px]:px-5 max-[761px]:py-8.5 max-[761px]:text-center',
                )}
            >
                {/* QR code */}
                <div className="rounded-3xl bg-white px-4 pt-4 pb-3 text-center shadow-[0_18px_36px_rgba(160,80,50,.14)] max-[761px]:order-2 max-[761px]:mx-auto max-[761px]:mb-1 max-[761px]:block max-[761px]:w-fit max-[761px]:rounded-[20px] max-[761px]:px-3 max-[761px]:pt-3 max-[761px]:pb-2.5">
                    <QrWeddingQrCode className="block size-50 max-[761px]:size-37.5" label={t('qrAlt')} size={200} />
                    <b
                        className={`mt-2 block font-[Arial,sans-serif] text-xs leading-[normal] font-bold tracking-[0.16em] uppercase ${QR_GRADIENT_TEXT}`}
                    >
                        {t('qr')}
                    </b>
                </div>

                {/* Copy */}
                <div className="max-[761px]:contents">
                    <div className="mb-3.5 font-[Arial,sans-serif] text-[11px] font-bold tracking-[0.2em] text-[#151313] max-[761px]:order-0">
                        {t('kicker')}
                    </div>
                    <h2
                        className="m-0 [font-family:var(--editorial)] text-[clamp(30px,3.2vw,46px)] leading-[1.06] font-normal tracking-[-0.035em] text-[#151313] max-[761px]:order-1 max-[761px]:mb-4.5"
                        id="qr-wedding-try-title"
                    >
                        {t('title')}
                        <span className="block font-bold">{t('titleSub')}</span>
                    </h2>
                    <p className="mt-4 mb-4.5 max-w-130 font-[Arial,sans-serif] text-base leading-[1.55] text-[rgba(21,19,19,.78)] max-[761px]:hidden">
                        {t('bodyDesktop')}
                    </p>
                    <p className="mx-auto mt-4 mb-3.5 hidden max-w-130 font-[Arial,sans-serif] text-base leading-[1.55] text-[rgba(21,19,19,.78)] max-[761px]:order-3 max-[761px]:block">
                        {t('bodyMobile')}
                    </p>
                    <ul className="m-0 flex list-none flex-wrap gap-x-5.5 gap-y-2.5 p-0 max-[761px]:order-4 max-[761px]:justify-center">
                        {(t.raw('checks') as string[]).map((check) => (
                            <li
                                className="flex items-center gap-2 font-[Arial,sans-serif] text-sm leading-[normal] font-bold text-[#151313]"
                                key={check}
                            >
                                <QrWeddingCheck
                                    className="size-6 bg-white shadow-[0_2px_6px_rgba(160,80,50,.12)]"
                                    iconClassName="size-3 stroke-[2.8]"
                                />
                                <span>{check}</span>
                            </li>
                        ))}
                    </ul>
                    <a
                        className="mt-5 hidden items-center gap-3 self-center rounded-full bg-[#151313] px-6 py-4 font-[Arial,sans-serif] text-xs leading-[normal] font-bold tracking-widest text-white uppercase max-[761px]:order-5 max-[761px]:inline-flex"
                        href={QR_WEDDING_UPLOAD_HREF}
                    >
                        <span>{t('button')}</span>
                        <span aria-hidden="true">↗</span>
                    </a>
                </div>
            </div>
        </section>
    );
}
