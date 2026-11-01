import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import type { Locale } from '@/i18n/config';
import { QR_WEDDING_SECTION } from '@/lib/qrWeddingPage';
import { cn } from '@/lib/utils';

type Step = { title: string; body: string };

// Scan (a QR grid), upload (an arrow out of a tray), together (stacked photos).
const STEP_ICONS: ReactNode[] = [
    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v4h-2zM14 18h4v2h-4zM20 20h0" key="scan" />,
    <path d="M12 16V5M7.5 9.5 12 5l4.5 4.5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" key="upload" />,
    <g key="together">
        <rect height="12" rx="2" width="14" x="7" y="4" />
        <path d="M3 8v10a2 2 0 0 0 2 2h12M10 13l3-3 5 5" />
    </g>,
];

const GRADIENT_NUMBER =
    'bg-[linear-gradient(90deg,#f2c764_0%,#f09a62_55%,#df7794_100%)] bg-clip-text text-transparent [-webkit-text-fill-color:transparent]';

// The three steps in one row after the heading; stacked and centered at 760px and narrower.
export async function QrWeddingHowItWorks({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.howItWorks' });
    const steps = t.raw('steps') as Step[];

    return (
        <section
            aria-labelledby="qr-wedding-how-title"
            className="relative bg-white px-[clamp(28px,5.5vw,96px)] py-[clamp(30px,3.2vw,48px)] text-[#151313] max-[768px]:pt-13.75 max-[761px]:px-5 max-[761px]:pb-9.5"
            id={QR_WEDDING_SECTION.howItWorks}
        >
            <div className="mx-auto grid w-[min(1480px,100%)] grid-cols-[1.12fr_1fr_1fr_1.12fr] items-stretch max-[761px]:block">
                {/* Heading */}
                <div className="relative flex min-w-0 flex-col justify-center pt-1 pr-[clamp(42px,4vw,72px)] pb-0.5 after:absolute after:top-[52%] after:-right-2 after:-translate-y-1/2 after:[font-family:var(--editorial)] after:text-[clamp(62px,5.8vw,98px)] after:leading-none after:font-light after:text-[rgba(222,127,131,.14)] after:content-['→'] max-[761px]:mb-8.5 max-[761px]:items-center max-[761px]:p-0 max-[761px]:text-center max-[761px]:after:hidden">
                    <div className="mb-3 font-[Arial,Helvetica,sans-serif] text-[10px] leading-[1.2] font-extrabold tracking-[0.16em] text-[#151313] max-[768px]:text-[11px]">
                        {t('kicker')}
                    </div>
                    <h2
                        className="m-0 max-w-92.5 bg-[linear-gradient(90deg,#f2c764_0%,#f29a62_48%,#df7794_100%)] bg-clip-text [font-family:var(--editorial)] text-[clamp(34px,3.15vw,51px)] leading-[.92] font-normal tracking-[-0.045em] text-transparent [-webkit-text-fill-color:transparent] max-[768px]:text-[clamp(37px,9.5vw,48px)] max-[768px]:leading-[1.03] max-[768px]:tracking-[-0.04em] max-[761px]:mx-auto max-[761px]:max-w-full"
                        id="qr-wedding-how-title"
                    >
                        {t.rich('title', { br: () => <br /> })}
                    </h2>
                </div>

                {/* Steps */}
                {steps.map((step, index) => (
                    <article
                        className={cn(
                            'relative flex min-w-0 flex-col justify-center pt-1 pr-[clamp(24px,2.3vw,38px)] pb-0.5 max-[761px]:mt-7 max-[761px]:items-center max-[761px]:border-l-0 max-[761px]:p-0 max-[761px]:text-center',
                            index === 0 ? 'pl-[clamp(34px,3vw,48px)]' : 'border-l border-[rgba(21,19,19,.13)] pl-[clamp(24px,2.3vw,38px)]',
                        )}
                        key={step.title}
                    >
                        <div className="mb-3 inline-flex w-max items-center gap-2.25 max-[761px]:mx-auto max-[761px]:mb-2.5 max-[761px]:gap-2">
                            <span
                                className={`font-[Arial,Helvetica,sans-serif] text-xs leading-none font-black tracking-[0.08em] ${GRADIENT_NUMBER}`}
                            >
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <svg
                                aria-hidden="true"
                                className="size-5.25 shrink-0 fill-none stroke-[rgba(220,121,134,.72)] stroke-[1.35] [stroke-linecap:round] [stroke-linejoin:round] max-[761px]:size-5"
                                viewBox="0 0 24 24"
                            >
                                {STEP_ICONS[index]}
                            </svg>
                        </div>
                        <h3 className="m-0 [font-family:var(--editorial)] text-[clamp(27px,2vw,34px)] leading-[.98] font-normal tracking-[-0.03em] text-[#151313] max-[761px]:text-[31px]">
                            {step.title}
                        </h3>
                        <p className="mt-2.5 max-w-82.5 font-[Arial,Helvetica,sans-serif] text-[15px] leading-[1.45] text-[#151313] max-[761px]:mx-auto max-[761px]:max-w-full max-[761px]:text-[17px] max-[761px]:leading-[1.5]">
                            {t.rich(`steps.${index}.body`, { strong: (chunks) => <strong>{chunks}</strong> })}
                        </p>
                    </article>
                ))}
            </div>
        </section>
    );
}
