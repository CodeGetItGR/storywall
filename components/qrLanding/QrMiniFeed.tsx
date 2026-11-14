import { CalendarDays, Heart, House, Mail, MapPin, Menu, MessageCircle, Music, Settings, Share2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { Logo } from '@/components/common/Logo';
import { ProtectedImage } from '@/components/common/ProtectedImage';
import { QR_JOIN_PREVIEW_IMAGES } from '@/lib/qrLanding';

// A grey line standing in for text, so the preview reads as the app without words in one language or occasion.
export function TextLine({ width, className = 'bg-ink/12' }: { width: string; className?: string }) {
    return <span className={`block h-3 rounded-full ${className}`} style={{ width }} />;
}

const TAB_ICONS = [House, Music, Mail, Share2, Settings, Menu];

// The event feed as a phone shows it, drawn at full phone width (390px) and scaled down by the frame around it.
// The banner is the event's own cover and name; the stories and the post are samples.
export function QrMiniFeed({ coverSrc, title }: { coverSrc: string | null; title: string }) {
    const t = useTranslations('QrCodePage');

    return (
        <div className="relative h-[762px] w-[390px] overflow-hidden bg-background pt-6">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3">
                <Logo iconClassName="h-9 w-auto" wordmarkClassName="h-7 w-auto" className="gap-2" />
                <div className="flex gap-3">
                    {[0, 1, 2, 3].map((slot) => (
                        <span key={slot} className="flex flex-col items-center gap-1.5">
                            <TextLine width="30px" className="h-5 bg-ink/80" />
                            <TextLine width="12px" className="h-2 bg-ink/25" />
                        </span>
                    ))}
                </div>
            </div>

            {/* Banner */}
            <div className="relative mx-2 h-[256px] overflow-hidden rounded-[28px] bg-gradient-brand">
                {coverSrc ? (
                    <ProtectedImage src={coverSrc} alt={t('defaultHeroImageAlt')} fill sizes="120px" className="object-cover" />
                ) : null}
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
                <p className="absolute right-6 bottom-5 left-6 truncate font-editorial text-[30px] text-white">{title}</p>
            </div>

            {/* Date and place */}
            <div className="flex items-center justify-between px-4 pt-4 text-ink-muted">
                <span className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" aria-hidden="true" />
                    <TextLine width="110px" className="bg-ink/30" />
                </span>
                <span className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                    <TextLine width="130px" className="bg-ink/30" />
                </span>
            </div>

            {/* Stories */}
            <div className="flex gap-4 px-4 pt-6">
                {QR_JOIN_PREVIEW_IMAGES.stories.map((src) => (
                    <span key={src} className="flex flex-col items-center gap-2">
                        <span className="block rounded-full bg-gradient-brand p-[3px]">
                            <Image
                                src={src}
                                alt={t('preview.photo')}
                                width={60}
                                height={60}
                                sizes="20px"
                                className="h-[60px] w-[60px] rounded-full border-[3px] border-background object-cover"
                            />
                        </span>
                        <TextLine width="44px" className="bg-ink/20" />
                    </span>
                ))}
            </div>

            {/* Composer */}
            <div className="mx-3 mt-6 flex items-center gap-3 rounded-full border border-border p-2">
                <span className="h-10 w-10 rounded-full bg-primary" />
                <span className="flex h-10 flex-1 items-center rounded-full bg-surface-muted px-4">
                    <TextLine width="70%" className="bg-ink/15" />
                </span>
            </div>

            {/* Post */}
            <div className="pt-6">
                <div className="flex items-center gap-3 px-4">
                    <Image
                        src={QR_JOIN_PREVIEW_IMAGES.author}
                        alt={t('preview.photo')}
                        width={44}
                        height={44}
                        sizes="16px"
                        className="h-11 w-11 rounded-full object-cover"
                    />
                    <span className="flex flex-col gap-2">
                        <TextLine width="120px" className="bg-ink/70" />
                        <TextLine width="60px" className="bg-ink/20" />
                    </span>
                </div>
                <div className="flex flex-col gap-2.5 px-4 py-4">
                    <TextLine width="90%" className="bg-ink/35" />
                    <TextLine width="55%" className="bg-ink/35" />
                </div>
                <div className="relative h-[260px]">
                    <Image src={QR_JOIN_PREVIEW_IMAGES.post} alt={t('preview.photo')} fill sizes="120px" className="object-cover" />
                </div>
                <div className="flex items-center gap-4 px-4 pt-3 text-ink-muted">
                    <Heart className="h-6 w-6" aria-hidden="true" />
                    <MessageCircle className="h-6 w-6" aria-hidden="true" />
                </div>
            </div>

            {/* Tab bar */}
            <div className="absolute inset-x-0 bottom-0 flex h-20 items-center justify-around rounded-t-[28px] border-t border-border bg-background text-ink-muted">
                {TAB_ICONS.map((Icon, index) => (
                    <Icon key={index} className={index === 0 ? 'h-8 w-8 text-primary' : 'h-8 w-8'} aria-hidden="true" />
                ))}
            </div>
        </div>
    );
}
