'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Loader2, VideoOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { PostMediaImageSlide } from '@/components/feed/post/PostMediaImageSlide';
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
        <div className={cn('relative h-full w-full overflow-hidden', className)}>
            <div className="h-full w-full overflow-hidden" ref={emblaRef}>
                <div className="flex h-full">
                    {media.map((item, index) => (
                        <div key={item.id} className="relative h-full shrink-0 grow-0 basis-full">
                            {item.mediaType === 'VIDEO' && item.status === 'PROCESSING' ? (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-sm font-semibold text-white/75">
                                    <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
                                    <p>{t('videoProcessing')}</p>
                                </div>
                            ) : item.mediaType === 'VIDEO' && item.status === 'FAILED' ? (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-8 text-center text-sm font-semibold text-white/75">
                                    <VideoOff className="h-7 w-7" aria-hidden="true" />
                                    <p>{t('videoFailed')}</p>
                                </div>
                            ) : item.mediaType === 'VIDEO' ? (
                                <video
                                    src={item.mediaUrl}
                                    controls
                                    playsInline
                                    preload={index === currentIndex ? 'auto' : 'metadata'}
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <PostMediaImageSlide
                                    mediaUrl={item.mediaUrl}
                                    alt={alt}
                                    loading={index === currentIndex ? 'eager' : 'lazy'}
                                    active={index === currentIndex}
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
                        className="absolute top-1/2 left-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 disabled:opacity-30 disabled:hover:bg-black/50"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={scrollNext}
                        disabled={!canScrollNext}
                        aria-label={t('nextMedia')}
                        className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 disabled:opacity-30 disabled:hover:bg-black/50"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </>
            )}
        </div>
    );
}
