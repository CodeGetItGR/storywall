'use client';

import { ChevronLeft, ChevronRight, Download, Loader2, VideoOff, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CSSProperties, TouchEvent as ReactTouchEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { useImageZoomPan } from '@/hooks/useImageZoomPan';
import { useOverlayHistory } from '@/hooks/useOverlayHistory';
import type { MediaResponseDto } from '@/lib/api/types';

const SWIPE_THRESHOLD_PX = 50;
const SWIPE_TRANSITION_MS = 260;
const SWIPE_RESISTANCE = 0.35;

interface GalleryViewerProps {
    media: MediaResponseDto | null;
    keepsOriginals: boolean;
    originalError: string | null;
    isDownloadingOriginal: boolean;
    hasPrevious: boolean;
    hasNext: boolean;
    onClose: () => void;
    onDownloadOriginal: () => void;
    onPrevious: () => void;
    onNext: () => void;
}

export function GalleryViewer({
    media,
    keepsOriginals,
    originalError,
    isDownloadingOriginal,
    hasPrevious,
    hasNext,
    onClose,
    onDownloadOriginal,
    onPrevious,
    onNext,
}: GalleryViewerProps) {
    const t = useTranslations('GalleryPage');
    const { requestClose } = useOverlayHistory(media !== null, onClose);

    const [dragX, setDragX] = useState(0);
    const [dragTransitionEnabled, setDragTransitionEnabled] = useState(false);
    const [enterOffset, setEnterOffset] = useState<'0' | '100%' | '-100%'>('0');

    const containerRef = useRef<HTMLDivElement | null>(null);
    const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
    const isNavigatingRef = useRef(false);
    const navigationTimerRef = useRef<number | null>(null);

    const isImage = media?.mediaType !== 'VIDEO';
    const zoom = useImageZoomPan(containerRef);

    useEffect(() => {
        zoom.reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [media?.id]);

    useEffect(
        () => () => {
            if (navigationTimerRef.current !== null) window.clearTimeout(navigationTimerRef.current);
        },
        []
    );

    const triggerPrevious = useCallback(() => {
        if (!hasPrevious) return;
        setEnterOffset('-100%');
        onPrevious();
    }, [hasPrevious, onPrevious]);

    const triggerNext = useCallback(() => {
        if (!hasNext) return;
        setEnterOffset('100%');
        onNext();
    }, [hasNext, onNext]);

    useEffect(() => {
        if (!media) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') triggerPrevious();
            if (event.key === 'ArrowRight') triggerNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [media, triggerNext, triggerPrevious]);

    const handleSwipeStart = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
        if (isNavigatingRef.current) return;
        const touch = event.touches[0];
        swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
        setDragTransitionEnabled(false);
    }, []);

    const handleSwipeMove = useCallback(
        (event: ReactTouchEvent<HTMLDivElement>) => {
            const start = swipeStartRef.current;
            if (!start) return;

            const touch = event.touches[0];
            const deltaX = touch.clientX - start.x;
            const deltaY = touch.clientY - start.y;
            if (Math.abs(deltaY) > Math.abs(deltaX)) return;

            const goingPrevious = deltaX > 0;
            const resistance = (goingPrevious && !hasPrevious) || (!goingPrevious && !hasNext) ? SWIPE_RESISTANCE : 1;
            setDragX(deltaX * resistance);
        },
        [hasNext, hasPrevious]
    );

    const handleSwipeEnd = useCallback(() => {
        const start = swipeStartRef.current;
        swipeStartRef.current = null;
        if (!start) return;

        const goingPrevious = dragX > 0;
        const canNavigate = goingPrevious ? hasPrevious : hasNext;

        if (Math.abs(dragX) < SWIPE_THRESHOLD_PX || !canNavigate) {
            setDragTransitionEnabled(true);
            setDragX(0);
            return;
        }

        const containerWidth = containerRef.current?.offsetWidth ?? window.innerWidth;
        isNavigatingRef.current = true;
        setDragTransitionEnabled(true);
        setDragX(goingPrevious ? containerWidth + 40 : -(containerWidth + 40));

        navigationTimerRef.current = window.setTimeout(() => {
            setDragTransitionEnabled(false);
            setDragX(0);
            if (goingPrevious) triggerPrevious();
            else triggerNext();
            isNavigatingRef.current = false;
        }, SWIPE_TRANSITION_MS);
    }, [dragX, hasNext, hasPrevious, triggerNext, triggerPrevious]);

    const handleSwipeCancel = useCallback(() => {
        swipeStartRef.current = null;
        if (isNavigatingRef.current) return;
        setDragTransitionEnabled(true);
        setDragX(0);
    }, []);

    const handleTouchStart = useCallback(
        (event: ReactTouchEvent<HTMLDivElement>) => {
            if (!isImage) {
                handleSwipeStart(event);
                return;
            }

            zoom.handleTouchStart(event);
            if (event.touches.length === 1 && !zoom.isZoomed) handleSwipeStart(event);
        },
        [handleSwipeStart, isImage, zoom]
    );

    const handleTouchMove = useCallback(
        (event: ReactTouchEvent<HTMLDivElement>) => {
            if (!isImage) {
                handleSwipeMove(event);
                return;
            }

            if (event.touches.length >= 2 || zoom.isZoomed) {
                zoom.handleTouchMove(event);
                return;
            }
            handleSwipeMove(event);
        },
        [handleSwipeMove, isImage, zoom]
    );

    const handleTouchEnd = useCallback(
        (event: ReactTouchEvent<HTMLDivElement>) => {
            if (!isImage) {
                handleSwipeEnd();
                return;
            }

            const wasZoomed = zoom.isZoomed;
            zoom.handleTouchEnd(event);
            if (!wasZoomed) handleSwipeEnd();
        },
        [handleSwipeEnd, isImage, zoom]
    );

    const handleTouchCancel = useCallback(() => {
        zoom.reset();
        handleSwipeCancel();
    }, [handleSwipeCancel, zoom]);

    if (!media) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
            role="dialog"
            aria-modal="true"
            aria-label={t('viewerLabel')}
        >
            {/* Viewer close button */}
            <button
                type="button"
                onClick={requestClose}
                className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white"
                aria-label={t('closeViewer')}
            >
                <X className="h-5 w-5" />
            </button>
            {/* Previous/next navigation */}
            {hasPrevious && (
                <button
                    type="button"
                    onClick={triggerPrevious}
                    className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white sm:left-4"
                    aria-label={t('previousMedia')}
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
            )}
            {hasNext && (
                <button
                    type="button"
                    onClick={triggerNext}
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white sm:right-4"
                    aria-label={t('nextMedia')}
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            )}
            <div className="flex h-full w-full max-w-5xl flex-col items-center justify-center gap-3 py-4">
                {/* Viewer image */}
                <div
                    key={media.id}
                    ref={containerRef}
                    className="motion-gallery-media relative h-[70vh] w-full touch-none overflow-hidden"
                    style={
                        {
                            transform: `translateX(${dragX}px)`,
                            transition: dragTransitionEnabled ? `transform ${SWIPE_TRANSITION_MS}ms var(--motion-ease-standard)` : 'none',
                            '--gallery-media-enter-offset': enterOffset,
                        } as CSSProperties
                    }
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchCancel}
                >
                    {media.mediaType === 'VIDEO' && media.status === 'PROCESSING' ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-sm font-semibold text-white/75">
                            <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
                            <p>{t('videoProcessing')}</p>
                        </div>
                    ) : media.mediaType === 'VIDEO' && media.status === 'FAILED' ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-8 text-center text-sm font-semibold text-white/75">
                            <VideoOff className="h-7 w-7" aria-hidden="true" />
                            <p>{t('videoFailed')}</p>
                        </div>
                    ) : media.mediaType === 'VIDEO' ? (
                        <video src={media.mediaUrl} controls playsInline className="h-full w-full object-contain" />
                    ) : (
                        <div
                            className="h-full w-full"
                            style={{
                                transform: `translate(${zoom.translate.x}px, ${zoom.translate.y}px) scale(${zoom.scale})`,
                                transition: zoom.isTransitionEnabled ? 'transform 200ms var(--motion-ease-standard)' : 'none',
                            }}
                        >
                            <ProtectedImage src={media.mediaUrl} alt={media.originalFilename} fill sizes="100vw" className="object-contain" />
                        </div>
                    )}
                </div>
                {/* Viewer actions */}
                {keepsOriginals && (
                    <button
                        type="button"
                        onClick={onDownloadOriginal}
                        disabled={isDownloadingOriginal}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
                    >
                        {isDownloadingOriginal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        {t('downloadOriginal')}
                    </button>
                )}
                {originalError && <p className="text-xs text-rose-200">{originalError}</p>}
            </div>
        </div>
    );
}
