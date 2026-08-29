'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { MediaResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface PostMediaCarouselProps {
    media: MediaResponseDto[];
    initialIndex: number;
    onIndexChange: (index: number) => void;
    alt: string;
    className?: string;
}

export function PostMediaCarousel({ media, initialIndex, onIndexChange, alt, className }: PostMediaCarouselProps) {
    const t = useTranslations('PostModal');
    const [emblaRef, emblaApi] = useEmblaCarousel({ startIndex: initialIndex });
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    useEffect(() => {
        if (!emblaApi) return;

        function handleSelect() {
            const index = emblaApi!.selectedScrollSnap();
            setCurrentIndex(index);
            setCanScrollPrev(emblaApi!.canScrollPrev());
            setCanScrollNext(emblaApi!.canScrollNext());
            onIndexChange(index);
        }

        handleSelect();
        emblaApi.on('select', handleSelect);
        emblaApi.on('reInit', handleSelect);

        return () => {
            emblaApi.off('select', handleSelect);
            emblaApi.off('reInit', handleSelect);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- The carousel only needs the current callback when selection changes; resubscribing on each parent render would tear down Embla listeners unnecessarily.
    }, [emblaApi]);

    const hasMultiple = media.length > 1;

    const scrollPrev = useCallback(() => {
        emblaApi?.scrollPrev();
    }, [emblaApi]);

    const scrollNext = useCallback(() => {
        emblaApi?.scrollNext();
    }, [emblaApi]);

    return (
        <div className={cn('relative w-full h-full overflow-hidden', className)}>
            <div className="w-full h-full overflow-hidden" ref={emblaRef}>
                <div className="flex h-full">
                    {media.map((item, index) => (
                        <div key={item.id} className="relative shrink-0 grow-0 basis-full h-full">
                            {item.mediaType === 'VIDEO' ? (
                                <video
                                    src={item.mediaUrl}
                                    controls
                                    playsInline
                                    preload={index === currentIndex ? 'auto' : 'metadata'}
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <ProtectedImage
                                    src={item.mediaUrl}
                                    alt={alt}
                                    fill
                                    className="object-contain"
                                    sizes="100vw"
                                    loading={index === currentIndex ? 'eager' : 'lazy'}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {hasMultiple && (
                <>
                    <button
                        type="button"
                        onClick={scrollPrev}
                        disabled={!canScrollPrev}
                        aria-label={t('previousMedia')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:hover:bg-black/50 text-white flex items-center justify-center transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={scrollNext}
                        disabled={!canScrollNext}
                        aria-label={t('nextMedia')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:hover:bg-black/50 text-white flex items-center justify-center transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs tabular-nums">
                        {currentIndex + 1} / {media.length}
                    </div>
                </>
            )}
        </div>
    );
}
