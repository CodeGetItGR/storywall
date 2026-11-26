'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { MediaThumbnail } from '@/components/common/MediaThumbnail';
import { AppLink } from '@/components/ui/AppLink';
import type { MediaResponseDto } from '@/lib/api/types';
import { FEED_MOSAIC_TILES } from '@/lib/feedModuleContent';
import { cn } from '@/lib/utils';

export type FeedMosaicTile = Pick<MediaResponseDto, 'id' | 'mediaUrl' | 'mediaType' | 'status' | 'thumbnailUrl'>;

type FeedGalleryMosaicProps = {
    tiles: readonly FeedMosaicTile[];
    more: number;
    // Where a tapped photo leads; null: the photos aren't links.
    href: string | null;
    // No photos at all (GE1): the big tile shows a camera. While loading the tiles stay plain.
    empty: boolean;
    // The camera's alt: the module's name.
    name: string;
};

const TILE = 'relative overflow-hidden rounded-xl bg-[#f5efe9]';
// The big tile on the left over both rows, two small ones on the right.
const PLACES = ['row-span-2', '', ''] as const;

// Look G2: one big photo and two small ones; the last small one says how many more the album holds.
export function FeedGalleryMosaic({ tiles, more, href, empty, name }: FeedGalleryMosaicProps) {
    const t = useTranslations('FeedModuleBlocks');
    const tAlt = useTranslations('ImageAlt');

    return (
        <div className="grid aspect-[3/2] w-full grid-cols-[2fr_1fr] grid-rows-2 gap-2">
            {Array.from({ length: FEED_MOSAIC_TILES }, (_, index) => {
                const tile = tiles[index];
                const place = PLACES[index];
                // An empty slot: blank, or GE1's dashed big tile with a camera.
                if (!tile) {
                    const camera = empty && index === 0;
                    return (
                        <div
                            key={`blank-${index}`}
                            className={cn(TILE, place, camera && 'flex items-center justify-center border-2 border-dashed border-[#e8dccf]')}
                        >
                            {camera && <Image src="/icons/camera.svg" alt={name} width={56} height={56} className="h-14 w-14" unoptimized />}
                        </div>
                    );
                }
                const last = index === FEED_MOSAIC_TILES - 1 && more > 0;
                const content = (
                    <>
                        <MediaThumbnail
                            src={tile.mediaUrl}
                            mediaType={tile.mediaType}
                            status={tile.status}
                            thumbnailUrl={tile.thumbnailUrl}
                            alt={tAlt(tile.mediaType === 'VIDEO' ? 'guestVideo' : 'guestPhoto')}
                            fill
                            sizes={index === 0 ? '(min-width: 640px) 320px, 66vw' : '(min-width: 640px) 160px, 33vw'}
                            className="object-cover"
                        />
                        {/* How many more */}
                        {last && (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-[26px] font-semibold text-white">
                                <span aria-hidden="true">+{more}</span>
                                <span className="sr-only">{t('galleryMore', { count: more })}</span>
                            </span>
                        )}
                    </>
                );
                return (
                    <MosaicTile key={tile.id} href={href} className={cn(TILE, place)}>
                        {content}
                    </MosaicTile>
                );
            })}
        </div>
    );
}

function MosaicTile({ href, className, children }: { href: string | null; className: string; children: ReactNode }) {
    if (!href) return <div className={className}>{children}</div>;
    return (
        <AppLink href={href} className={cn(className, 'block focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none')}>
            {children}
        </AppLink>
    );
}
