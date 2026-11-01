import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { localizeLegalHref } from '@/i18n/publicLocale';
import { QR_WEDDING_GALLERY_HREF, QR_WEDDING_SECTION, type QrWeddingFaqItem, type QrWeddingFaqLink } from '@/lib/qrWeddingPage';
import { routes } from '@/lib/routes';

function faqLinkHref(to: QrWeddingFaqLink['to'], locale: Locale): string {
    if (to === 'gallery') return QR_WEDDING_GALLERY_HREF;
    if (to === 'terms') return localizeLegalHref(routes.legal.withdrawalTerms(), locale);
    return `#${QR_WEDDING_SECTION.pricing}`;
}

// Numbered questions that open one at a time. items: the FAQ with the price already filled in.
export async function QrWeddingFaq({ locale, items }: { locale: Locale; items: QrWeddingFaqItem[] }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.faq' });

    return (
        <section
            aria-labelledby="qr-wedding-faq-title"
            className="relative overflow-hidden bg-white px-[clamp(24px,7vw,120px)] pt-16 pb-18 text-[#151313] max-[761px]:px-5 max-[761px]:pt-12 max-[761px]:pb-14.5"
            id={QR_WEDDING_SECTION.faq}
        >
            {/* Heading */}
            <div className="mx-auto mb-7.5 w-full max-w-190 text-center max-[761px]:mb-6.5">
                <h2
                    className="m-0 mb-[.3em] [font-family:var(--editorial)] text-[clamp(48px,4.875vw,78px)] leading-[.82] font-normal tracking-[-0.065em] max-[761px]:text-[68px]"
                    id="qr-wedding-faq-title"
                >
                    {t('title')}
                </h2>
                <p className="mx-auto mb-2 max-w-107.5 text-sm leading-[1.45] max-[761px]:mt-2.5 max-[761px]:max-w-[92%] max-[761px]:text-[13px]">
                    {t('intro')}
                </p>
            </div>

            {/* Questions */}
            <div className="mx-auto w-full max-w-295 border-t border-[rgba(21,19,19,.26)]">
                {items.map((item, index) => (
                    <details className="group border-b border-[rgba(21,19,19,.2)]" key={item.q} name="qr-faq">
                        <summary className="grid min-h-17 cursor-pointer list-none grid-cols-[44px_minmax(0,1fr)_30px] items-center gap-3.5 py-4.25 max-[761px]:min-h-15.5 max-[761px]:grid-cols-[32px_minmax(0,1fr)_28px] max-[761px]:gap-2.5 max-[761px]:py-3.5 [&::-webkit-details-marker]:hidden">
                            <span className="[font-family:var(--editorial)] text-[22px] leading-none tracking-[-0.04em] transition-colors duration-300 group-open:text-[#d87d8f] max-[761px]:text-lg min-[1001px]:group-hover:text-[#d87d8f]">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="[font-family:var(--editorial)] text-[clamp(23px,1.8vw,30px)] leading-[1.14] font-normal tracking-[-0.028em] max-[761px]:text-[clamp(21px,6vw,26px)] max-[761px]:leading-[1.18] max-[761px]:tracking-[-0.025em] max-[601px]:wrap-anywhere">
                                {item.q}
                            </span>
                            <span
                                aria-hidden="true"
                                className="flex size-7.25 items-center justify-center rounded-full border border-[rgba(21,19,19,.34)] font-[Arial,Helvetica,sans-serif] text-base leading-none transition-[transform,background,color] duration-300 ease-[cubic-bezier(.22,.61,.36,1)] group-open:rotate-45 group-open:bg-[#151313] group-open:text-white max-[761px]:size-6.75 max-[761px]:text-[15px] min-[1001px]:group-hover:scale-106"
                            >
                                +
                            </span>
                        </summary>
                        <div className="ml-14.5 max-w-240 pt-0.5 pr-10.5 pb-6 font-[Arial,Helvetica,sans-serif] text-sm leading-[1.55] max-[761px]:ml-10.5 max-[761px]:pr-5 max-[761px]:pb-5 max-[761px]:text-[13px] max-[761px]:leading-normal">
                            {item.a}
                            {item.link && (
                                <>
                                    {' '}
                                    <a className="underline underline-offset-3" href={faqLinkHref(item.link.to, locale)}>
                                        {item.link.label}
                                    </a>
                                </>
                            )}
                        </div>
                    </details>
                ))}
            </div>
        </section>
    );
}
