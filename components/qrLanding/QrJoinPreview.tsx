import { Heart, Music, ThumbsUp } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { QrMiniFeed, TextLine } from '@/components/qrLanding/QrMiniFeed';
import { QR_JOIN_PREVIEW_IMAGES } from '@/lib/qrLanding';

const FLOAT_CLASS = 'absolute overflow-hidden rounded-xl bg-background shadow-[0_10px_20px_-12px_rgba(40,20,10,0.55)]';

// A glimpse of the event before joining (KAN-213): a small phone with the feed, sample photos, a wish and a song request around it.
export function QrJoinPreview({ coverSrc, title }: { coverSrc: string | null; title: string }) {
    const t = useTranslations('QrCodePage');

    return (
        <div role="img" aria-label={t('preview.feed')} className="relative mx-auto h-[222px] w-full max-w-[300px]">
            {/* Photos */}
            <span className={`${FLOAT_CLASS} top-[22px] -left-1 h-20 w-20 -rotate-[8deg] border-[3px] border-background`}>
                <Image src={QR_JOIN_PREVIEW_IMAGES.photos[0]} alt={t('preview.photo')} fill sizes="80px" className="object-cover" />
            </span>
            <span className={`${FLOAT_CLASS} top-[120px] left-1.5 z-30 h-[70px] w-[70px] rotate-[5deg] border-[3px] border-background`}>
                <Image src={QR_JOIN_PREVIEW_IMAGES.photos[1]} alt={t('preview.photo')} fill sizes="70px" className="object-cover" />
            </span>

            {/* Phone with the feed */}
            <div className="absolute top-0 left-1/2 z-20 h-[222px] w-[114px] -translate-x-1/2 overflow-hidden rounded-[20px] border-4 border-ink bg-background pt-[7px] shadow-[0_14px_24px_-14px_rgba(40,20,10,0.55)]">
                <span className="absolute top-[3px] left-1/2 z-10 h-[7px] w-[30px] -translate-x-1/2 rounded-full bg-ink" />
                <div className="origin-top-left scale-[0.2718]">
                    <QrMiniFeed coverSrc={coverSrc} title={title} />
                </div>
            </div>

            {/* Wish */}
            <div role="img" aria-label={t('preview.wish')} className={`${FLOAT_CLASS} top-[30px] -right-2 z-30 flex w-24 rotate-[6deg] flex-col gap-1.5 p-2.5`}>
                <span className="flex items-center justify-between">
                    <TextLine width="45%" className="h-1.5 bg-ink/70" />
                    <Heart className="h-3 w-3 fill-accent-pink text-accent-pink" aria-hidden="true" />
                </span>
                <TextLine width="35%" className="h-1 bg-ink/20" />
                <TextLine width="95%" className="mt-1 h-1 bg-ink/35" />
                <TextLine width="70%" className="h-1 bg-ink/35" />
            </div>

            {/* Song */}
            <div role="img" aria-label={t('preview.song')} className={`${FLOAT_CLASS} top-[132px] -right-1.5 z-30 flex w-[92px] -rotate-[4deg] items-center gap-2 p-2.5`}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-brand text-white">
                    <Music className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <TextLine width="80%" className="h-1.5 bg-ink/70" />
                    <TextLine width="55%" className="h-1 bg-ink/25" />
                </span>
                <ThumbsUp className="h-3 w-3 shrink-0 text-ink-muted" aria-hidden="true" />
            </div>
        </div>
    );
}
