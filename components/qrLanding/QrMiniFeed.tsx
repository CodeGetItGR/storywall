import { Heart, House, Mail, Menu, MessageCircle, Music, Settings, Share2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { Logo } from '@/components/common/Logo';
import { ProtectedImage } from '@/components/common/ProtectedImage';
import { QR_JOIN_PREVIEW_COUNTDOWN, QR_JOIN_PREVIEW_IMAGES } from '@/lib/qrLanding';

const TAB_ICONS = [House, Music, Mail, Share2, Settings, Menu];
const STORY_NAMES = ['story1', 'story2', 'story3', 'story4'] as const;

// The event feed as a phone shows it, drawn at full phone width (390px) and scaled down by the frame around it.
// The banner is the event's own cover and name; the stories and the post are samples.
export function QrMiniFeed({ coverSrc, title }: { coverSrc: string | null; title: string }) {
    const t = useTranslations('QrCodePage');
    const tComposer = useTranslations('ComposerCard');

    return (
        <div className="relative h-[762px] w-[390px] overflow-hidden bg-background pt-6">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3">
                <Logo iconClassName="h-9 w-auto" wordmarkClassName="h-7 w-auto" className="gap-2" />
                <div className="flex gap-3">
                    {QR_JOIN_PREVIEW_COUNTDOWN.map(({ value, unit }) => (
                        <span key={unit} className="flex flex-col items-center leading-none">
                            <span className="text-[22px] font-bold text-ink">{value}</span>
                            <span className="pt-1 text-[11px] font-semibold text-ink-muted">{t(`preview.${unit}`)}</span>
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


            {/* Stories */}
            <div className="flex gap-4 px-4 pt-6">
                {QR_JOIN_PREVIEW_IMAGES.stories.map((src, index) => (
                    <span key={src} className="flex w-[66px] flex-col items-center gap-2">
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
                        <span className="w-full truncate text-center text-[13px] text-ink">{t(`preview.${STORY_NAMES[index]}`)}</span>
                    </span>
                ))}
            </div>

            {/* Composer */}
            <div className="mx-3 mt-6 flex items-center gap-3 rounded-full border border-border p-2">
                <span className="h-10 w-10 rounded-full bg-primary" />
                <span className="flex h-10 flex-1 items-center rounded-full bg-surface-muted px-4">
                    <span className="truncate text-[15px] text-ink-muted">{tComposer('placeholder')}</span>
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
                    <span className="text-[16px] font-semibold text-ink">{t('preview.postAuthor')}</span>
                </div>
                <p className="px-4 py-4 text-[16px] text-ink">{t('preview.postText')}</p>
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
