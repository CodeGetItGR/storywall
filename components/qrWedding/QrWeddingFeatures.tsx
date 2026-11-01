import { getTranslations } from 'next-intl/server';

import { GradientIcon } from '@/components/occasions/wedding/mock/GradientIcon';
import type { Locale } from '@/i18n/config';
import { QR_WEDDING_MEDIA, QR_WEDDING_SECTION, qrWeddingParentPath } from '@/lib/qrWeddingPage';

type Feature = { title: string; body: string };

const ICONS = ['icon-invitation', 'icon-rsvp', 'icon-posts', 'icon-stories', 'icon-wishbook'];

// The rest of the wedding website on a dark band, with a link to the wedding page.
export async function QrWeddingFeatures({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.features' });
    const items = t.raw('items') as Feature[];
    const weddingPath = qrWeddingParentPath(locale);

    return (
        <section
            aria-labelledby="qr-wedding-features-title"
            className="bg-[#342525] bg-[radial-gradient(at_14%_12%,rgba(174,78,67,.3)_0%,transparent_44%),radial-gradient(at_88%_78%,rgba(189,113,65,.21)_0%,transparent_47%),linear-gradient(125deg,#3b2529_0%,#2e2328_42%,#302523_72%,#402a26_100%)] pt-[clamp(75px,7vw,110px)] pb-[clamp(70px,7vw,110px)] text-white max-[761px]:pb-16.25 max-[601px]:pt-17.5 max-[601px]:pb-15.5"
            id={QR_WEDDING_SECTION.features}
        >
            <div className="mx-auto w-[min(1220px,100%_-_64px)] max-[761px]:w-[calc(100%_-_40px)] max-[601px]:w-[calc(100%_-_36px)]">
                {/* Heading */}
                <div className="mx-auto mb-14 max-w-250 text-center max-[761px]:mb-9">
                    <div className="mb-4.5 font-[Arial,sans-serif] text-[11px] font-extrabold tracking-[0.16em] text-(--acid) uppercase">
                        {t('kicker')}
                    </div>
                    <h2
                        className="m-0 [font-family:var(--editorial)] text-[clamp(40px,4.6vw,76px)] leading-[.95] font-normal tracking-[-0.05em] max-[768px]:text-[clamp(36px,9vw,46px)] max-[768px]:leading-[1.05]"
                        id="qr-wedding-features-title"
                    >
                        {t.rich('title', { br: () => <br />, strong: (chunks) => <strong className="font-bold">{chunks}</strong> })}
                    </h2>
                </div>

                {/* Features */}
                <div className="grid grid-cols-5 gap-x-[clamp(18px,2.2vw,34px)] gap-y-[clamp(22px,3vw,44px)] max-[1101px]:grid-cols-2 max-[901px]:grid-cols-[repeat(2,minmax(0,1fr))] max-[901px]:gap-x-5.5 max-[901px]:gap-y-7.5 max-[768px]:items-start max-[768px]:gap-x-4.5 max-[768px]:gap-y-8.5">
                    {items.map((item, index) => (
                        <article className="min-w-0" key={item.title}>
                            <GradientIcon
                                className="mb-4.5 size-15.5 drop-shadow-[0_4px_8px_rgba(230,126,105,.14)] max-[768px]:mb-3.75 max-[768px]:size-12"
                                src={`${QR_WEDDING_MEDIA}/${ICONS[index]}.webp`}
                            />
                            <h3 className="m-0 mb-2 [font-family:var(--editorial)] text-[23px] leading-[1.05] font-normal tracking-[-0.03em] max-[768px]:text-[clamp(17px,4.7vw,22px)] max-[768px]:leading-[1.12]">
                                {item.title}
                            </h3>
                            <p className="m-0 font-[Arial,Helvetica,sans-serif] text-sm leading-normal text-[rgba(255,255,255,.66)] max-[768px]:text-[clamp(12px,3.25vw,14px)] max-[768px]:leading-[1.48]">
                                {item.body}
                            </p>
                        </article>
                    ))}
                </div>

                {/* Link to the wedding page */}
                {weddingPath && (
                    <div className="mt-[clamp(36px,4vw,56px)] flex justify-center">
                        <a
                            className="inline-flex items-center rounded-full border border-[rgba(255,255,255,.4)] px-7 py-4 font-[Arial,Helvetica,sans-serif] text-[13px] font-bold tracking-[0.12em] text-white uppercase transition-colors duration-200 hover:bg-white hover:text-[#151313]"
                            href={weddingPath}
                        >
                            {t('more')}
                        </a>
                    </div>
                )}
            </div>
        </section>
    );
}
