import { getTranslations } from 'next-intl/server';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { QR_GRADIENT_TEXT, QR_PANEL, QR_PANEL_TINT } from '@/components/qrWedding/qrWeddingClasses';
import { QrWeddingQrCode } from '@/components/qrWedding/QrWeddingQrCode';
import type { Locale } from '@/i18n/config';
import { QR_WEDDING_MEDIA, QR_WEDDING_SECTION } from '@/lib/qrWeddingPage';
import { cn } from '@/lib/utils';

type Phone = { name: string; role: string; count: string; alt: string };
type Stat = { value: string; label: string };

const AVATAR = (name: string) => `/landing/wedding/wedding-marquee-avatar-${name}.webp`;

// Each guest's phone: what's on its screen, who holds it, where it sits and where its caption goes.
const PHONES = [
    {
        file: 'guest-photo-ceremony',
        avatar: 'anna',
        className: 'left-0 top-[9%] -rotate-7 z-1',
        caption: '-bottom-10 max-[901px]:bottom-auto max-[901px]:-top-8.5',
    },
    {
        file: 'guest-photo-newlyweds-arrive',
        avatar: 'giorgos',
        className: 'left-[23%] top-0 rotate-3 z-2 max-[901px]:-mt-3.5',
        caption: '-top-10.5 max-[901px]:top-auto max-[901px]:-bottom-8.5',
    },
    {
        file: 'guest-photo-first-dance',
        avatar: 'nikos',
        className: 'left-[46%] top-[13%] -rotate-3 z-3',
        caption: '-bottom-10 max-[901px]:bottom-auto max-[901px]:-top-8.5',
    },
    {
        file: 'guest-photo-reception-dancing',
        avatar: 'katerina',
        className: 'left-[68%] top-[3%] rotate-6 z-2 max-[901px]:hidden',
        caption: '-top-10.5',
    },
] as const;

// The gallery tiles, in order. The fifth is a guest's video.
const TILES = [
    { file: 'gallery-dress', width: 840, height: 1050 },
    { file: 'gallery-bride-portrait', width: 1050, height: 788 },
    { file: 'guest-photo-ceremony', width: 840, height: 1050 },
    { file: 'guest-photo-newlyweds-arrive', width: 840, height: 1050 },
    { file: 'gallery-tender-moment', width: 840, height: 1050, video: true },
    { file: 'guest-photo-first-dance', width: 840, height: 1050 },
    { file: 'guest-photo-reception-dancing', width: 591, height: 1050 },
    { file: 'gallery-party', width: 840, height: 1050 },
    { file: 'gallery-groom-friends', width: 840, height: 1050 },
];

const CAMERA_ICON = 'after:bg-[url(/landing/qr-wedding/icon-camera.svg)]';
const PLAY_ICON = 'after:bg-[url(/landing/qr-wedding/icon-play.svg)]';

const DASHED_LINE =
    'h-0.5 flex-1 bg-[repeating-linear-gradient(90deg,#f0a08a_0_6px,transparent_6px_12px)] max-[901px]:h-auto max-[901px]:w-0.5 max-[901px]:bg-[repeating-linear-gradient(180deg,#f0a08a_0_6px,transparent_6px_12px)]';

// Guests' phones feed one QR code, which fills one wedding gallery; then an example wedding's numbers.
export async function QrWeddingGuestPhotos({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.guests' });
    const phones = t.raw('phones') as Phone[];
    const tiles = t.raw('tiles') as string[];
    const stats = t.raw('stats') as Stat[];
    const toastPhone = phones[2];

    return (
        <section aria-labelledby="qr-wedding-why-title" className="bg-white pt-[clamp(70px,8vw,110px)] pb-15" id={QR_WEDDING_SECTION.why}>
            <div
                className={cn(
                    QR_PANEL,
                    QR_PANEL_TINT,
                    'px-[clamp(18px,3vw,48px)] pt-[clamp(44px,5vw,74px)] pb-[clamp(36px,4vw,56px)] max-[761px]:px-3.5 max-[761px]:pt-10 max-[761px]:pb-8.5',
                )}
            >
                {/* Heading */}
                <div className="mx-auto mb-[clamp(34px,4vw,56px)] max-w-245 text-center">
                    <div className="mb-4.5 font-[Arial,Helvetica,sans-serif] text-[11px] font-bold tracking-[0.2em] text-[#ff765f] uppercase">
                        {t('kicker')}
                    </div>
                    <h2
                        className="m-0 [font-family:var(--editorial)] text-[clamp(34px,4.2vw,64px)] leading-[1.04] font-normal tracking-[-0.04em] text-[#151313]"
                        id="qr-wedding-why-title"
                    >
                        {t.rich('title', { br: () => <br />, strong: (chunks) => <strong className="font-bold">{chunks}</strong> })}
                    </h2>
                    <p className="mx-auto mt-5.5 max-w-160 font-[Arial,Helvetica,sans-serif] text-[clamp(16px,1.45vw,19px)] leading-[1.55] text-[#6f6a64]">
                        {t('body')}
                    </p>
                </div>

                {/* Phones, QR code and gallery */}
                <div className="grid grid-cols-[minmax(0,1.05fr)_190px_minmax(0,1fr)] items-center max-[901px]:grid-cols-1">
                    {/* Phones */}
                    <div className="relative my-6 h-[clamp(360px,33vw,440px)] max-[901px]:m-0 max-[901px]:flex max-[901px]:h-auto max-[901px]:justify-center max-[901px]:pt-10 max-[901px]:pb-11">
                        {PHONES.map((phone, index) => (
                            <figure
                                className={cn(
                                    'absolute m-0 w-[clamp(120px,11.5vw,158px)] max-[901px]:relative max-[901px]:top-auto! max-[901px]:left-auto! max-[901px]:mx-[-4%] max-[901px]:w-[31%] max-[901px]:max-w-37.5',
                                    phone.className,
                                )}
                                key={phone.file}
                            >
                                <div
                                    className={cn(
                                        "relative aspect-[9/18.5] overflow-hidden rounded-[22px] border-3 border-[#151313] bg-[#151313] shadow-[0_22px_40px_rgba(60,40,25,.2)] after:absolute after:bottom-[6%] after:left-1/2 after:z-2 after:aspect-square after:w-[19%] after:-translate-x-1/2 after:rounded-full after:bg-[rgba(255,255,255,.22)] after:bg-size-[52%] after:bg-center after:bg-no-repeat after:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,.8),0_2px_8px_rgba(0,0,0,.18)] after:backdrop-blur-[3px] after:content-['']",
                                        CAMERA_ICON,
                                    )}
                                >
                                    <ProtectedImage
                                        alt={phones[index].alt}
                                        className="block size-full object-cover"
                                        height={1050}
                                        sizes="160px"
                                        src={`${QR_WEDDING_MEDIA}/${phone.file}.webp`}
                                        width={phone.file === 'guest-photo-reception-dancing' ? 591 : 840}
                                    />
                                </div>
                                <figcaption
                                    className={cn(
                                        'absolute left-1/2 flex -translate-x-1/2 items-center gap-1.75 rounded-full bg-white py-1.25 pr-2.75 pl-1.25 font-[Arial,Helvetica,sans-serif] text-[11px] leading-[1.15] whitespace-nowrap text-[#5f5a55] shadow-[0_12px_26px_rgba(60,40,25,.24)] max-[901px]:py-1 max-[901px]:pr-2 max-[901px]:pl-1 max-[901px]:text-[10px]',
                                        phone.caption,
                                    )}
                                >
                                    <ProtectedImage
                                        alt={phones[index].name}
                                        className="size-6.5 flex-none rounded-full object-cover max-[901px]:size-5.5"
                                        height={80}
                                        src={AVATAR(phone.avatar)}
                                        width={80}
                                    />
                                    <span>
                                        <b className="text-[#151313]">{phones[index].name}</b>
                                        <i className="not-italic max-[901px]:hidden"> · {phones[index].role}</i>
                                        <em className="block text-[10.5px] font-bold text-[#2a6834] not-italic max-[901px]:text-[9.5px]">
                                            {phones[index].count}
                                        </em>
                                    </span>
                                </figcaption>
                            </figure>
                        ))}
                    </div>

                    {/* QR code between dashed lines */}
                    <div aria-hidden="true" className="flex h-full flex-row items-center justify-center max-[901px]:h-52.5 max-[901px]:flex-col">
                        <span className={DASHED_LINE} />
                        <span className="grid w-35.5 flex-none place-items-center content-center gap-2 rounded-[22px] bg-white px-3 pt-3 pb-2.5 shadow-[0_18px_36px_rgba(60,40,25,.18)] max-[901px]:w-34">
                            <QrWeddingQrCode className="block size-29.5 max-[901px]:size-28" label={t('qr')} size={118} />
                            <b className={`font-[Arial,Helvetica,sans-serif] text-[11px] font-bold tracking-[0.12em] uppercase ${QR_GRADIENT_TEXT}`}>
                                {t('qr')}
                            </b>
                        </span>
                        <span className={DASHED_LINE} />
                    </div>

                    {/* Gallery */}
                    <div
                        aria-label={t('albumLabel')}
                        className="relative rounded-3xl bg-white px-4.5 pt-4.5 pb-5 shadow-[0_24px_50px_rgba(60,40,25,.14)] max-[761px]:px-3 max-[761px]:pt-3.5 max-[761px]:pb-6.5"
                        role="img"
                    >
                        <div className="mb-3.5 flex items-center justify-between gap-2.5">
                            <div>
                                <div className="font-[Arial,Helvetica,sans-serif] text-[10px] font-bold tracking-[0.16em] text-[#9a938b] uppercase">
                                    {t('albumKicker')}
                                </div>
                                <div className="mt-1 [font-family:var(--editorial)] text-[22px] leading-[1.1] tracking-[-0.02em] text-[#151313]">
                                    {t('albumTitle')}
                                </div>
                            </div>
                            <span className="rounded-full bg-[#e4f0e1] px-3 py-1.75 font-[Arial,Helvetica,sans-serif] text-[11px] font-bold tracking-[0.04em] whitespace-nowrap text-[#2a6834]">
                                {t('albumBadge')}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.75">
                            {TILES.map((tile, index) => (
                                <div
                                    className={cn(
                                        'relative aspect-square overflow-hidden rounded-xl',
                                        tile.video &&
                                            `after:absolute after:top-1/2 after:left-1/2 after:-mt-4.25 after:-ml-4.25 after:size-8.5 after:rounded-full after:bg-[rgba(255,255,255,.9)] after:bg-size-[18px] after:bg-center after:bg-no-repeat after:content-[''] ${PLAY_ICON}`,
                                    )}
                                    key={tile.file}
                                >
                                    <ProtectedImage
                                        alt={tiles[index]}
                                        className="block size-full object-cover"
                                        height={tile.height}
                                        sizes="(max-width: 900px) 30vw, 140px"
                                        src={`${QR_WEDDING_MEDIA}/${tile.file}.webp`}
                                        width={tile.width}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="absolute -bottom-4.5 -left-8.5 flex items-center gap-2.25 rounded-full bg-white py-2 pr-4 pl-2 font-[Arial,Helvetica,sans-serif] text-[13px] whitespace-nowrap text-[#5f5a55] shadow-[0_14px_30px_rgba(60,40,25,.18)] max-[901px]:-bottom-5 max-[901px]:left-1/2 max-[901px]:-translate-x-1/2 max-[901px]:text-xs">
                            <ProtectedImage
                                alt={toastPhone.name}
                                className="size-8 flex-none rounded-full object-cover"
                                height={80}
                                src={AVATAR('nikos')}
                                width={80}
                            />
                            <span>{t.rich('toast', { b: (chunks) => <b className="text-[#151313]">{chunks}</b> })}</span>
                        </div>
                    </div>
                </div>

                {/* Example wedding */}
                <div className="mt-[clamp(48px,5vw,70px)] mb-3.5 text-center font-[Arial,Helvetica,sans-serif] text-[10.5px] font-bold tracking-[0.18em] text-[#9a938b] uppercase">
                    {t('example')}
                </div>
                <div className="mx-auto grid max-w-205 grid-cols-4 text-center font-[Arial,Helvetica,sans-serif] text-[11px] font-bold tracking-[0.16em] text-[#7d776f] uppercase max-[761px]:grid-cols-2 max-[761px]:gap-y-6.5">
                    {stats.map((stat) => (
                        <div key={stat.label}>
                            <b
                                className={`mb-2 block [font-family:var(--editorial)] text-[clamp(52px,5vw,74px)] leading-none font-normal tracking-[-0.04em] normal-case ${QR_GRADIENT_TEXT}`}
                            >
                                {stat.value}
                            </b>
                            {stat.label}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
