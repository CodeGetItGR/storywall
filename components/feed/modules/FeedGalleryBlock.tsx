'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { FeedGalleryMosaic, type FeedMosaicTile } from '@/components/feed/modules/FeedGalleryMosaic';
import { FEED_MODULE_BUTTON, FeedModuleCard, FeedModuleTitle } from '@/components/feed/modules/FeedModuleCard';
import { cn } from '@/lib/utils';

export type FeedGalleryUpload = {
    onFiles: (event: ChangeEvent<HTMLInputElement>) => void;
    uploading: boolean;
    notice: string | null;
    accept: string;
};

export type FeedGalleryBlockProps = {
    name: string;
    tiles: readonly FeedMosaicTile[];
    more: number;
    loading: boolean;
    photosHref: string | null;
    // null: this visitor can't upload here now (a read-only event), and the button isn't drawn.
    upload: FeedGalleryUpload | null;
    archiveNote: boolean;
    // false: the event lost the gallery; edit mode draws the empty look with the button off.
    available: boolean;
    underTools?: boolean;
};

// The feed's Gallery block (KAN-299): look G2 with photos, GE1 without.
export function FeedGalleryBlock({ name, tiles, more, loading, photosHref, upload, archiveNote, available, underTools }: FeedGalleryBlockProps) {
    const t = useTranslations('FeedModuleBlocks');
    const tGallery = useTranslations('GalleryPage');
    const empty = !loading && tiles.length === 0;
    const label = empty ? t('galleryUploadFirst') : t('galleryUpload');

    return (
        <FeedModuleCard underTools={underTools}>
            {/* Title */}
            <FeedModuleTitle>{name}</FeedModuleTitle>

            {/* Mosaic */}
            <FeedGalleryMosaic tiles={tiles} more={more} href={photosHref} empty={empty} name={name} />

            {/* Empty line */}
            {empty && <p className="text-[14px] text-ink-muted">{tGallery('emptyTitle')}</p>}

            {/* Upload */}
            {!available ? (
                <button type="button" disabled className={cn(FEED_MODULE_BUTTON, 'opacity-50')}>
                    {label}
                </button>
            ) : (
                upload && (
                    <label
                        className={cn(
                            FEED_MODULE_BUTTON,
                            'cursor-pointer has-[:focus-visible]:ring-2',
                            upload.uploading && 'pointer-events-none opacity-70',
                        )}
                    >
                        {upload.uploading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {label}
                        <input
                            type="file"
                            accept={upload.accept}
                            multiple
                            disabled={upload.uploading}
                            onChange={upload.onFiles}
                            className="sr-only"
                        />
                    </label>
                )
            )}

            {/* Upload notes */}
            {/* Always there while uploads are possible, so a screen reader hears each new line. */}
            {upload && (
                <p role="status" className="text-[13px] text-ink-muted empty:hidden">
                    {upload.notice}
                </p>
            )}
            {archiveNote && <p className="text-[12px] text-ink-faint">{tGallery('memberArchiveUploadNote')}</p>}
        </FeedModuleCard>
    );
}
