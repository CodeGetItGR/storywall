'use client';

import { Check } from 'lucide-react';
import Image from 'next/image';
import { useLocale } from 'next-intl';

import { ModulePreviewFrame, type ModulePreviewProps } from '@/components/home/modulePreviews/previewFrame';
import { formatShortDateTime } from '@/lib/datetime';
import { cn } from '@/lib/utils';

const SAMPLE_MEDIA = [
    { filename: 'IMG_2481.jpg', src: '/images/post-cake.png', selected: true },
    { filename: 'IMG_2482.jpg', src: '/images/post-tux.png', selected: false },
    { filename: 'IMG_2486.jpg', src: '/images/post-florals.png', selected: false },
    { filename: 'IMG_2490.jpg', src: '/images/post-flowers.png', selected: false },
];

/** Replica of components/gallery/GalleryMediaGrid.tsx in selection mode. */
export function GalleryPreview({ variant }: ModulePreviewProps) {
    const locale = useLocale();
    const takenAt = formatShortDateTime('2026-08-22T21:40:00.000Z', locale);

    return (
        <ModulePreviewFrame variant={variant}>
            {/* Media grid */}
            <div className="grid grid-cols-2 gap-3 px-4 pt-4">
                {SAMPLE_MEDIA.map((item) => (
                    <div
                        key={item.filename}
                        className={cn(
                            'group overflow-hidden rounded-2xl border bg-card shadow-sm',
                            item.selected ? 'border-primary ring-4 ring-primary/15' : 'border-border'
                        )}
                    >
                        <div className="relative aspect-square bg-surface-muted">
                            <Image src={item.src} alt="" fill sizes="140px" className={cn('object-cover', item.selected && 'brightness-75')} />
                            <span
                                className={cn(
                                    'absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border text-white shadow-sm',
                                    item.selected ? 'border-primary bg-primary' : 'border-white/80 bg-black/35'
                                )}
                            >
                                {item.selected && <Check className="h-4 w-4" />}
                            </span>
                        </div>
                        <div className="px-3 py-2 text-left">
                            <p className="truncate text-xs font-semibold text-ink">{item.filename}</p>
                            <p className="mt-0.5 text-[11px] text-ink-muted">{takenAt}</p>
                        </div>
                    </div>
                ))}
            </div>
        </ModulePreviewFrame>
    );
}
