import { getTranslations } from 'next-intl/server';

import { QrWeddingCheck } from '@/components/qrWedding/QrWeddingCheck';
import { QR_GRADIENT_TEXT, QR_PANEL, QR_PANEL_TINT } from '@/components/qrWedding/qrWeddingClasses';
import { QrWeddingCreateCta } from '@/components/qrWedding/QrWeddingCreateCta';
import type { Locale } from '@/i18n/config';
import { QR_WEDDING_SECTION } from '@/lib/qrWeddingPage';
import { cn } from '@/lib/utils';

// true: a tick, false: a dash, text: a short note.
type Cell = boolean | string;
type Row = { label: string; app: Cell; storywall: Cell };

const HEAD_CELL =
    'px-2 pt-3.75 pb-3 text-center font-[Arial,sans-serif] text-xs leading-[normal] font-bold tracking-[0.12em] text-[#7d776f] uppercase max-[761px]:px-1 max-[761px]:pt-3 max-[761px]:text-[10px] max-[761px]:tracking-[0.06em]';
const BODY_CELL = 'w-[27%] border-t border-[rgba(21,19,19,.09)] px-2 py-3.75 text-center max-[761px]:px-1 max-[761px]:py-3';

function CompareCell({ value, storywall, yes, no }: { value: Cell; storywall: boolean; yes: string; no: string }) {
    if (value === true) {
        return (
            <>
                <QrWeddingCheck className="inline-grid size-8 bg-[#e4f0e1]" iconClassName="size-4" />
                <span className="sr-only">{yes}</span>
            </>
        );
    }
    if (value === false) {
        return (
            <>
                <span aria-hidden="true" className="font-[Arial,sans-serif] text-xl leading-[normal] text-[#c9c2ba]">
                    —
                </span>
                <span className="sr-only">{no}</span>
            </>
        );
    }
    return (
        <span
            className={cn(
                'font-[Arial,sans-serif] text-[13.5px] leading-[1.35] text-[#7d776f] max-[761px]:text-xs',
                storywall && 'font-bold text-[#2a6834]',
            )}
        >
            {value}
        </span>
    );
}

// price: the cheapest wedding package, or empty when the packages can't be read.
export async function QrWeddingCompare({ locale, price }: { locale: Locale; price: string }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.compare' });
    const hero = await getTranslations({ locale, namespace: 'QrWeddingPage.hero' });
    const rows = t.raw('rows') as Row[];

    return (
        <section aria-labelledby="qr-wedding-compare-title" className="bg-white pt-5.5 pb-15" id={QR_WEDDING_SECTION.compare}>
            <div
                className={cn(
                    QR_PANEL,
                    QR_PANEL_TINT,
                    'px-[clamp(16px,2.6vw,36px)] pt-[clamp(40px,5vw,70px)] pb-[clamp(30px,3.5vw,48px)] max-[761px]:px-3 max-[761px]:pt-9 max-[761px]:pb-5',
                )}
            >
                {/* Heading */}
                <div className="mx-auto mb-[clamp(28px,3.5vw,46px)] max-w-250 text-center">
                    <h2
                        className="m-0 [font-family:var(--editorial)] text-[clamp(34px,4vw,60px)] leading-[1.04] font-normal tracking-[-0.04em] text-[#151313]"
                        id="qr-wedding-compare-title"
                    >
                        {t('title')}
                        <span className={`mx-auto block w-fit pb-[.08em] ${QR_GRADIENT_TEXT}`}>{t('titleSub')}</span>
                    </h2>
                    <p className="mx-auto mt-5.5 max-w-160 font-[Arial,sans-serif] text-[clamp(16px,1.45vw,19px)] leading-[1.55] text-[#6f6a64]">
                        {t('body')}
                    </p>
                </div>

                {/* Table */}
                <div className="mx-auto max-w-215 rounded-3xl bg-white px-[clamp(14px,2.4vw,34px)] pt-2.5 pb-3.5 max-[761px]:px-2.5 max-[761px]:pt-1 max-[761px]:pb-2">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className={HEAD_CELL} scope="col">
                                    <span className="sr-only">{t('feature')}</span>
                                </th>
                                <th className={HEAD_CELL} scope="col">
                                    {t('app')}
                                </th>
                                <th className={HEAD_CELL} scope="col">
                                    <span className="inline-block rounded-full bg-[#e4f0e1] px-4.5 py-2.25 tracking-[0.14em] text-[#2a6834] max-[761px]:px-2.5 max-[761px]:py-1.75 max-[761px]:tracking-[0.08em]">
                                        {t('storywall')}
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.label}>
                                    <th
                                        className="w-[46%] border-t border-[rgba(21,19,19,.09)] px-2 py-3.75 text-left [font-family:var(--editorial)] text-[clamp(16px,1.35vw,19px)] leading-[1.2] font-normal tracking-[-0.02em] text-[#151313] max-[761px]:px-1 max-[761px]:py-3 max-[761px]:text-[15px]"
                                        scope="row"
                                    >
                                        {row.label}
                                    </th>
                                    <td className={BODY_CELL}>
                                        <CompareCell no={t('no')} storywall={false} value={row.app} yes={t('yes')} />
                                    </td>
                                    <td className={BODY_CELL}>
                                        <CompareCell no={t('no')} storywall value={row.storywall} yes={t('yes')} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Call to action */}
                <div className="mt-[clamp(28px,3.5vw,44px)] flex flex-col items-center gap-3.5 text-center">
                    <QrWeddingCreateCta>{hero.rich('cta', { br: () => <br /> })}</QrWeddingCreateCta>
                    {price && (
                        <p className="m-0 font-[Arial,sans-serif] text-[15px] leading-normal text-[#6f6a64]">
                            {t.rich('note', { price, strong: (chunks) => <strong className="text-[#151313]">{chunks}</strong> })}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
