import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { Locale } from '@/i18n/config';
import { QR_WEDDING_DEMO_HREF, QR_WEDDING_GALLERY_HREF, QR_WEDDING_MEDIA, QR_WEDDING_SECTION } from '@/lib/qrWeddingPage';
import { cn } from '@/lib/utils';

const BUTTON =
    'items-center justify-center rounded-full font-[Arial,sans-serif] text-xs leading-[normal] font-black tracking-[0.14em] text-[#151313] uppercase transition-[transform,background,color,box-shadow] duration-300 ease-[ease]';
const BUTTON_SOLID =
    'bg-white shadow-[0_10px_28px_rgba(21,19,19,.1)] min-[1001px]:hover:-translate-y-0.75 min-[1001px]:hover:shadow-[0_14px_34px_rgba(21,19,19,.15)]';
const BUTTON_GHOST =
    'border-[1.5px] border-[#151313] bg-transparent hover:bg-[#151313] hover:text-white min-[1001px]:hover:-translate-y-0.75 min-[1001px]:hover:shadow-[0_14px_34px_rgba(21,19,19,.15)]';
// The desktop pair sits under the copy; the full-width pair sits under the phones at 760px and narrower.
const BUTTON_DESKTOP = 'inline-flex min-h-17 flex-none px-8 max-[761px]:hidden';
const BUTTON_MOBILE = 'hidden min-h-17.5 w-full px-5.5 max-[761px]:flex';

function DemoButton({ href, label, text, className }: { href: string; label: string; text: string; className: string }) {
    return (
        <a aria-label={label} className={cn(BUTTON, className)} href={href}>
            <span>{text}</span>
        </a>
    );
}

// The demo wedding: links to its wall and its gallery beside two phones showing them.
export async function QrWeddingDemo({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.demo' });
    const strong = (chunks: ReactNode) => <strong className="font-bold">{chunks}</strong>;
    const buttons = (placement: string) => (
        <>
            <DemoButton className={cn(placement, BUTTON_SOLID)} href={QR_WEDDING_DEMO_HREF} label={t('demoLabel')} text={t('demo')} />
            <DemoButton
                className={cn(placement, BUTTON_GHOST, 'max-[761px]:mt-3')}
                href={QR_WEDDING_GALLERY_HREF}
                label={t('galleryLabel')}
                text={t('gallery')}
            />
        </>
    );

    return (
        <section
            aria-labelledby="qr-wedding-demo-title"
            className="grid grid-cols-[.5fr_1.42fr_.92fr] items-center gap-x-[3vw] overflow-hidden bg-[radial-gradient(circle_at_84%_66%,rgba(242,145,77,.3)_0%,rgba(242,145,77,.2)_16%,rgba(242,145,77,.08)_30%,transparent_46%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,.34),transparent_34%),linear-gradient(135deg,#f7d9a8_0%,#f8d08f_26%,#f8c87f_52%,#f6be79_76%,#f4b879_100%)] px-[5vw] pt-17 pb-18.5 text-[#151313] max-[761px]:block max-[761px]:px-5 max-[761px]:pt-14.5 max-[761px]:pb-15"
            id={QR_WEDDING_SECTION.demo}
        >
            {/* Kicker */}
            <div className="col-start-2 row-start-1 mb-4 self-end font-[Arial,sans-serif] text-[13px] font-black tracking-[0.15em] uppercase max-[761px]:mb-0 max-[761px]:pt-3 max-[761px]:text-[10px]">
                {t('kicker')}
            </div>

            {/* Copy and buttons */}
            <div className="col-start-2 row-start-2 self-start">
                <h2
                    className="m-0 max-w-180 [font-family:var(--editorial)] text-[clamp(54px,4.5vw,86px)] leading-[.96] font-normal tracking-[-0.055em] max-[761px]:mt-6 max-[761px]:max-w-none max-[761px]:text-[clamp(42px,10.5vw,58px)] max-[761px]:leading-[.98]"
                    id="qr-wedding-demo-title"
                >
                    {t.rich('title', { br: () => <br />, strong })}
                </h2>
                <div className="mt-8.5 flex flex-col items-start gap-5.5 border-t border-[#151313] pt-6.5 max-[761px]:mt-6.5 max-[761px]:block max-[761px]:pt-6">
                    <p className="m-0 max-w-125 font-[Arial,sans-serif] text-[clamp(22px,1.4vw,28px)] leading-[1.45] max-[1200px]:max-w-92.5 max-[941px]:max-w-67.5 max-[761px]:max-w-[92%] max-[761px]:text-lg max-[761px]:leading-normal">
                        {t.rich('body', { strong })}
                    </p>
                    <div className="flex flex-wrap gap-3.5">{buttons(BUTTON_DESKTOP)}</div>
                </div>
            </div>

            {/* Phones */}
            <div className="relative col-start-3 row-span-2 row-start-1 flex min-w-0 items-center justify-center justify-self-end pr-2 perspective-[1600px] max-[761px]:mx-auto max-[761px]:mt-7 max-[761px]:mb-0.5 max-[761px]:justify-self-auto max-[761px]:p-0">
                <ProtectedImage
                    alt={t('imageAlt')}
                    className="block h-auto w-[min(720px,37vw)] max-w-none translate-y-2.5 object-contain drop-shadow-[-12px_24px_26px_rgba(70,38,24,.2)] max-[761px]:w-[min(620px,118vw)] max-[761px]:-translate-x-[2vw] max-[761px]:translate-y-0 max-[761px]:drop-shadow-[-16px_30px_32px_rgba(70,38,24,.2)]"
                    height={1233}
                    sizes="(max-width: 760px) 118vw, 37vw"
                    src={`${QR_WEDDING_MEDIA}/demo-gallery-phones-${locale}.webp`}
                    width={1080}
                />
            </div>

            {/* Buttons under the phones on small screens */}
            <div className="hidden max-[761px]:mt-6.5 max-[761px]:block">{buttons(BUTTON_MOBILE)}</div>
        </section>
    );
}
