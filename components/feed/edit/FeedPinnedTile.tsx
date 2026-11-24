'use client';

import { GripVertical, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { useFeedPinnedTile } from '@/hooks/useFeedPinnedTile';
import { cn } from '@/lib/utils';

const TILE_BUTTON =
    'absolute grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white shadow-sm hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none [&_svg]:h-4 [&_svg]:w-4';

type FeedPinnedTileProps = { id: string; src: string | undefined; number: number; count: number; onRemove: (photoId: string) => void };

// One pinned photo in its settings sheet: a handle to drag it and a button to take it out.
export function FeedPinnedTile({ id, src, number, count, onRemove }: FeedPinnedTileProps) {
    const t = useTranslations('InvitationEditor.sections');
    const tPinned = useTranslations('FeedSections.pinned');
    const imageId = useId();
    const { setNodeRef, handleRef, handleProps, style, isDragging, remove } = useFeedPinnedTile(id, number, onRemove);

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={cn(
                'relative aspect-square overflow-hidden rounded-[10px] bg-(--smd-editor-control)',
                isDragging && 'z-10 opacity-80 shadow-lg',
            )}
        >
            {/* Photo */}
            {src && (
                // eslint-disable-next-line @next/next/no-img-element -- presigned R2 URLs
                <img id={imageId} src={src} alt={tPinned('photoAlt', { number, count })} className="h-full w-full object-cover" />
            )}

            {/* Actions: the picture tells the delete buttons, which share a name, apart */}
            <button
                type="button"
                aria-label={t('drag')}
                title={t('drag')}
                className={cn(TILE_BUTTON, 'bottom-1 left-1 cursor-grab touch-none active:cursor-grabbing')}
                ref={handleRef}
                {...handleProps}
            >
                <GripVertical aria-hidden="true" />
            </button>
            <button
                type="button"
                aria-label={t('delete')}
                title={t('delete')}
                aria-describedby={src ? imageId : undefined}
                onClick={remove}
                className={cn(TILE_BUTTON, 'top-1 right-1')}
            >
                <X aria-hidden="true" />
            </button>
        </li>
    );
}
