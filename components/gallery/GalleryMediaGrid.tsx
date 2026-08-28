'use client';

import { Check, ImagePlus, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent, PointerEvent, RefObject } from 'react';
import { useCallback } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { MediaResponseDto } from '@/lib/api/types';
import { formatShortDateTime } from '@/lib/datetime';
import { cn } from '@/lib/utils';

interface GalleryMediaGridProps {
    isLoading: boolean;
    isFetchingNextPage: boolean;
    items: MediaResponseDto[];
    selectedIds: Set<string>;
    selectionMode: boolean;
    loadMoreRef: RefObject<HTMLDivElement | null>;
    onMediaClick: (id: string) => void;
    onMediaPointerDown: (event: PointerEvent<HTMLButtonElement>, id: string) => void;
    onMediaPointerEnd: () => void;
    onMediaContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function GalleryMediaGrid({
    isLoading,
    isFetchingNextPage,
    items,
    selectedIds,
    selectionMode,
    loadMoreRef,
    onMediaClick,
    onMediaPointerDown,
    onMediaPointerEnd,
    onMediaContextMenu,
}: GalleryMediaGridProps) {
    const t = useTranslations('GalleryPage');
    const handleMediaClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const id = event.currentTarget.dataset.mediaId;
            if (id) onMediaClick(id);
        },
        [onMediaClick]
    );

    const handleMediaPointerDown = useCallback(
        (event: PointerEvent<HTMLButtonElement>) => {
            const id = event.currentTarget.dataset.mediaId;
            if (id) onMediaPointerDown(event, id);
        },
        [onMediaPointerDown]
    );

    return (
        <section>
            {/* Empty and loading states */}
            {isLoading ? (
                <div className="flex min-h-48 items-center justify-center rounded-2xl bg-card">
                    <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
                </div>
            ) : items.length === 0 ? (
                <div className="px-4 py-12 text-center">
                    <ImagePlus className="mx-auto h-8 w-8 text-ink-faint" />
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t('emptyTitle')}</p>
                </div>
            ) : (
                <>
                    {/* Media grid */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {items.map((item) => {
                            const isSelected = selectedIds.has(item.id);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    data-media-id={item.id}
                                    aria-pressed={selectionMode ? isSelected : undefined}
                                    aria-label={
                                        selectionMode
                                            ? t(isSelected ? 'unselectPhoto' : 'selectPhoto', { filename: item.originalFilename })
                                            : item.originalFilename
                                    }
                                    onPointerDown={handleMediaPointerDown}
                                    onPointerUp={onMediaPointerEnd}
                                    onPointerCancel={onMediaPointerEnd}
                                    onPointerLeave={onMediaPointerEnd}
                                    onClick={handleMediaClick}
                                    onContextMenu={onMediaContextMenu}
                                    className={cn(
                                        'group overflow-hidden rounded-md border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                                        'touch-pan-y select-none [-webkit-touch-callout:none]',
                                        isSelected ? 'border-primary ring-4 ring-primary/15' : 'border-border',
                                        selectionMode && 'cursor-grab active:cursor-grabbing'
                                    )}
                                >
                                    <div className="relative aspect-square bg-surface-muted">
                                        <ProtectedImage
                                            src={item.mediaUrl}
                                            alt={item.originalFilename}
                                            fill
                                            sizes="(min-width: 1024px) 25vw, 50vw"
                                            className={cn(
                                                'object-cover transition-transform group-hover:scale-[1.02]',
                                                isSelected && 'brightness-75'
                                            )}
                                        />
                                        {selectionMode && (
                                            <span
                                                className={cn(
                                                    'absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border text-white shadow-sm',
                                                    isSelected ? 'border-primary bg-primary' : 'border-white/80 bg-black/35'
                                                )}
                                            >
                                                {isSelected && <Check className="h-4 w-4" />}
                                            </span>
                                        )}
                                    </div>
                                    <div className="px-3 py-2 text-left">
                                        <p className="truncate text-xs font-semibold text-ink">{item.originalFilename}</p>
                                        <p className="mt-0.5 text-[11px] text-ink-muted">{formatShortDateTime(item.createdAt)}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
            <div ref={loadMoreRef} className="h-1" />
            {isFetchingNextPage && <p className="py-4 text-center text-sm text-ink-muted">{t('loadingMore')}</p>}
        </section>
    );
}
