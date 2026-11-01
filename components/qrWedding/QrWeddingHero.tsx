import { getTranslations } from 'next-intl/server';
import { preload } from 'react-dom';

import { OccasionHeroActions } from '@/components/occasions/OccasionHeroActions';
import { QR_GRADIENT_TEXT } from '@/components/qrWedding/qrWeddingClasses';
import { type QrWeddingHeroImageAlts, QrWeddingHeroVisual } from '@/components/qrWedding/QrWeddingHeroVisual';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { QR_WEDDING_CREATE_HREF, QR_WEDDING_DEMO_HREF, QR_WEDDING_MEDIA, QR_WEDDING_SECTION, qrWeddingParentPath } from '@/lib/qrWeddingPage';

const POSTER = `${QR_WEDDING_MEDIA}/guest-scanning-wedding-qr-code-poster.webp`;
const VIDEO = `${QR_WEDDING_MEDIA}/guest-scanning-wedding-qr-code.mp4`;

const TRUST_ITEM = "before:mx-2.5 before:content-['·'] first:before:hidden";

// price: the cheapest wedding package, or empty when the packages can't be read.
export async function QrWeddingHero({ locale, price }: { locale: Locale; price: string }) {
    const page = await getTranslations({ locale, namespace: 'QrWeddingPage' });
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.hero' });
    // The buttons share their labels with the wedding occasion page's hero.
    const occasion = await getTranslations({ locale, namespace: 'OccasionPages.WEDDING' });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage' });
    const parentPath = qrWeddingParentPath(locale);
    // The poster is the first thing painted in the hero: fetch it with the page.
    preload(POSTER, { as: 'image', fetchPriority: 'high' });

    return (
        <section
            aria-labelledby="qr-wedding-h1"
            className="relative overflow-hidden bg-white bg-[radial-gradient(42%_52%_at_12%_18%,rgba(248,154,176,.28),transparent_70%),radial-gradient(40%_50%_at_92%_22%,rgba(252,186,99,.3),transparent_70%),radial-gradient(50%_60%_at_70%_100%,rgba(255,118,95,.16),transparent_70%)] pt-37.5 pb-22.5 max-[901px]:pt-29.5 max-[901px]:pb-10 max-[768px]:pt-26.5 max-[768px]:pb-9"
            id={QR_WEDDING_SECTION.top}
        >
            <div className="mx-auto grid w-[min(1220px,100%_-_64px)] grid-cols-2 items-center gap-[clamp(20px,3vw,48px)] max-[901px]:grid-cols-1 max-[768px]:mx-5 max-[768px]:w-[calc(100%_-_40px)] max-[768px]:grid-cols-[minmax(0,1fr)] max-[768px]:gap-0">
                <div className="relative z-5 min-w-0 max-[768px]:max-w-full">
                    {/* Breadcrumb */}
                    <nav
                        aria-label={t('crumbLabel')}
                        className="mb-4.5 ml-1 flex items-center gap-2 font-[Arial,sans-serif] text-[11px] font-bold tracking-[0.06em] text-[rgba(21,19,19,.55)] uppercase max-[768px]:mb-3.5 max-[768px]:ml-0"
                    >
                        <a className="text-[#151313]" href={getPublicLandingPath(locale)}>
                            StoryWall
                        </a>
                        <span aria-hidden="true">›</span>
                        {parentPath && (
                            <>
                                <a className="text-[#151313]" href={parentPath}>
                                    {t('crumbWedding')}
                                </a>
                                <span aria-hidden="true">›</span>
                            </>
                        )}
                        <span aria-current="page">{page('name')}</span>
                    </nav>

                    {/* Heading */}
                    <p className="mb-5.5 ml-1 font-[Arial,Helvetica,sans-serif] text-[clamp(13px,.9vw,16px)] leading-[1.2] font-medium tracking-[-0.02em] uppercase max-[768px]:mb-4 max-[768px]:ml-0 max-[768px]:text-xs">
                        {t.rich('kicker', { strong: (chunks) => <strong>{chunks}</strong> })}
                    </p>
                    <h1
                        className="m-0 [font-family:var(--editorial)] text-[clamp(50px,5.2vw,92px)] leading-[.91] font-normal tracking-[-0.055em] max-[768px]:max-w-full max-[768px]:text-[clamp(37px,9vw,45px)] max-[768px]:leading-[1.02] max-[768px]:tracking-[-0.045em]"
                        id="qr-wedding-h1"
                    >
                        {t.rich('h1', { em: (chunks) => <em className={`pr-[.06em] italic max-[768px]:pr-0 ${QR_GRADIENT_TEXT}`}>{chunks}</em> })}
                    </h1>
                    <p className="mt-6.5 ml-1 max-w-130 font-[Georgia,serif] text-[clamp(17px,1.35vw,21px)] leading-[1.4] max-[768px]:mt-5 max-[768px]:ml-0 max-[768px]:max-w-full max-[768px]:text-lg max-[768px]:leading-[1.3]">
                        {t('sub')}
                    </p>
                    <p className="mt-3.5 ml-1 max-w-[min(460px,40vw)] font-[Arial,Helvetica,sans-serif] text-[15px] leading-[1.55] text-[rgba(21,19,19,.74)] max-[768px]:ml-0 max-[768px]:w-full max-[768px]:max-w-full">
                        {t('body')}
                    </p>

                    {/* Actions */}
                    <OccasionHeroActions
                        createHref={QR_WEDDING_CREATE_HREF}
                        createLabel={occasion('hero.cta')}
                        demoHref={QR_WEDDING_DEMO_HREF}
                        demoLabel={common('heroDemo')}
                        plansLabel={landing('hero.plansCta')}
                    />

                    {/* Trust line */}
                    <p
                        aria-label={t('trustLabel')}
                        className="mt-6 ml-1 flex flex-wrap gap-y-1.75 font-[Arial,Helvetica,sans-serif] text-[11px] leading-[1.25] font-bold tracking-[0.035em] text-[rgba(21,19,19,.66)] max-[768px]:mt-4.25 max-[768px]:ml-0 max-[768px]:gap-y-1.25 max-[768px]:text-[10px] max-[768px]:leading-[1.4]"
                    >
                        {(t.raw('trust') as string[]).map((item) => (
                            <span className={TRUST_ITEM} key={item}>
                                {item}
                            </span>
                        ))}
                        {price && (
                            <span
                                className={`${TRUST_ITEM} text-sm tracking-[0.02em] text-[#151313] max-[1200px]:mt-1 max-[1200px]:basis-full max-[1200px]:before:hidden max-[761px]:text-[12.5px]`}
                            >
                                {t.rich('price', { price, b: (chunks) => <b className={QR_GRADIENT_TEXT}>{chunks}</b> })}
                            </span>
                        )}
                    </p>
                </div>

                {/* Video */}
                <div className="relative flex min-w-0 justify-center max-[901px]:m-0 max-[901px]:block max-[768px]:mt-5.5 max-[768px]:w-full max-[768px]:max-w-full max-[768px]:overflow-visible">
                    <QrWeddingHeroVisual
                        alts={t.raw('images') as QrWeddingHeroImageAlts}
                        poster={POSTER}
                        video={VIDEO}
                        videoLabel={t('videoLabel')}
                    />
                </div>
            </div>
        </section>
    );
}
