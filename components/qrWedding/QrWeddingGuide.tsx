import { getTranslations } from 'next-intl/server';

import { QrWeddingGuideRow } from '@/components/qrWedding/QrWeddingGuideRow';
import type { Locale } from '@/i18n/config';
import { QR_WEDDING_GUIDE_ID } from '@/lib/qrWeddingPage';

// The questions people search for, answered in the server HTML.
export async function QrWeddingGuide({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.guide' });
    const places = t.raw('where.places') as string[];
    const signs = t.raw('sign.texts') as string[];

    return (
        <section
            className="bg-white px-5 pt-6 pb-14 text-[#151313] min-[761px]:px-[clamp(24px,7vw,120px)] min-[761px]:pt-10 min-[761px]:pb-20"
            id={QR_WEDDING_GUIDE_ID}
        >
            <div className="mx-auto w-full max-w-295">
                {/* What it is */}
                <QrWeddingGuideRow title={t('what.title')}>
                    <p className="m-0">{t('what.body')}</p>
                </QrWeddingGuideRow>

                {/* Where to put it */}
                <QrWeddingGuideRow title={t('where.title')}>
                    <ul className="m-0 grid list-disc gap-2 pl-5">
                        {places.map((place) => (
                            <li key={place}>{place}</li>
                        ))}
                    </ul>
                </QrWeddingGuideRow>

                {/* What to write on the sign */}
                <QrWeddingGuideRow title={t('sign.title')}>
                    <p className="m-0">{t('sign.intro')}</p>
                    <ul className="mt-4 mb-0 grid list-none gap-3 p-0">
                        {signs.map((sign) => (
                            <li className="rounded-2xl bg-[#f4f0e8] px-5 py-4 font-[Baskerville,Georgia,serif] text-[20px] leading-snug" key={sign}>
                                {sign}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-4 mb-0 text-[14px] leading-snug text-[#151313]/70">{t('sign.tip')}</p>
                </QrWeddingGuideRow>
            </div>
        </section>
    );
}
