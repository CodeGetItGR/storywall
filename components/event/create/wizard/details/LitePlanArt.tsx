'use client';

import { LiteBookCover, LiteBookSpread } from '@/components/event/create/wizard/details/LiteBook';
import { LiteFloatingWish, LitePhone, LitePhoto, LiteQrCard } from '@/components/event/create/wizard/details/LitePlanPieces';
import { type LitePlanArtKind, useLitePlanArt } from '@/hooks/useLitePlanArt';
import type { EventTypeConvention } from '@/lib/api/types';

type LitePlanArtProps = {
    kind: LitePlanArtKind;
    title: string;
    alt: string;
    eventType?: EventTypeConvention | null;
};

type BannerProps = { art: ReturnType<typeof useLitePlanArt>; title: string };

// What the lite plan gives the host, as a wide banner: the QR card and the gallery, the printed wishbook, or both.
export function LitePlanArt({ kind, title, alt, eventType = null }: LitePlanArtProps) {
    const art = useLitePlanArt(kind, title, eventType);
    const Banner = art.hasGallery && art.hasWishbook ? BundleBanner : art.hasGallery ? GalleryBanner : WishbookBanner;

    return (
        <div role="img" aria-label={alt} className="w-full">
            {/* The pieces are real app screens: kept out of the tab order and the accessibility tree. */}
            <div aria-hidden="true" inert className="relative h-[200px] overflow-hidden rounded-3xl bg-linear-to-br from-accent to-[#ffe6d6] md:h-[220px]">
                <Banner art={art} title={title} />
            </div>
        </div>
    );
}

// QR: the card guests scan, the gallery their photos land in, and two of them up close.
function GalleryBanner({ art, title }: BannerProps) {
    return (
        <>
            {/* Card */}
            <LiteQrCard art={art} className="absolute top-4 left-[5%] w-[112px] -rotate-4 md:w-[124px]" />
            {/* Gallery */}
            <LitePhone art={art} title={title} width={128} className="absolute top-7 left-[40%] z-10" />
            {/* Photos */}
            <LitePhoto art={art} index={0} className="top-8 right-[5%] z-20 size-20 rotate-6" />
            <LitePhoto art={art} index={1} className="top-[118px] right-[15%] z-20 size-16 -rotate-6" />
        </>
    );
}

// Wishbook: the printed book's cover with a page fanning out, the open book peeking behind, and wishes, written and recorded, around it.
function WishbookBanner({ art, title }: BannerProps) {
    return (
        <>
            {/* Book */}
            <LiteBookSpread art={art} scale={0.3} className="top-[86px] left-[20%] rotate-6" />
            <LiteBookCover art={art} title={title} scale={0.4} className="top-4 left-[7%] z-10" />
            {/* Wishes */}
            <LiteFloatingWish art={art} index={2} scale={0.4} className="top-5 left-[60%] z-20 rotate-2" />
            <LiteFloatingWish art={art} index={3} scale={0.4} className="top-[118px] left-[56%] z-20 -rotate-2" />
        </>
    );
}

// Bundle: the gallery on a phone with its download, the printed wishbook open in front, and wishes, written and recorded, around them.
function BundleBanner({ art, title }: BannerProps) {
    return (
        <>
            {/* Gallery */}
            <LitePhone art={art} title={title} width={122} tabs actions className="absolute top-6 left-[6%] -rotate-4" />
            {/* Book */}
            <LiteBookSpread art={art} scale={0.34} className="top-[78px] left-[34%] z-10 rotate-2" />
            {/* Wishes */}
            <LiteFloatingWish art={art} index={2} scale={0.38} className="top-3 left-[58%] z-20 rotate-2" />
            <LiteFloatingWish art={art} index={3} scale={0.38} className="top-[150px] left-[40%] z-20 -rotate-2" />
        </>
    );
}
