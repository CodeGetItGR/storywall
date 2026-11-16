import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { QrMiniFeed } from '@/components/qrLanding/QrMiniFeed';
import { QrPreviewSongCard, QrPreviewWishCard } from '@/components/qrLanding/QrPreviewCards';
import { QR_JOIN_PREVIEW_IMAGES } from '@/lib/qrLanding';

const FLOAT_CLASS = 'absolute overflow-hidden rounded-xl bg-background shadow-[0_10px_20px_-12px_rgba(40,20,10,0.55)]';

// A glimpse of the event before joining (KAN-213): a small phone with the feed, sample photos, a wish and a song request around it.
export function QrJoinPreview({ coverSrc, title }: { coverSrc: string | null; title: string }) {
    const t = useTranslations('QrCodePage');

    return (
        // Drawn at 300×222 and shown at 90%, so the card leaves more room below it.
        <div role="img" aria-label={t('preview.feed')} className="relative mx-auto h-[200px] w-full max-w-[270px]">
            <div className="absolute top-0 left-1/2 h-[222px] w-[300px] origin-top -translate-x-1/2 scale-90">
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

                {/* Wish: the wishbook's card at full size, scaled down */}
                <div role="img" aria-label={t('preview.wish')} className="absolute top-[44px] -right-3 z-30 h-[56px] w-[120px] rotate-[5deg]">
                    <div className="origin-top-left scale-[0.4]">
                        <QrPreviewWishCard />
                    </div>
                </div>

                {/* Song: the playlist's card at full size, scaled down */}
                <div role="img" aria-label={t('preview.song')} className="absolute top-[134px] -right-3 z-30 h-[46px] w-[120px] -rotate-[4deg]">
                    <div className="origin-top-left scale-[0.4]">
                        <QrPreviewSongCard />
                    </div>
                </div>
            </div>
        </div>
    );
}
