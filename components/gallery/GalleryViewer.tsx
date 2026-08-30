'use client';

import { ChevronLeft, ChevronRight, Download, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
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

    const handleSwipeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.pointerType === 'mouse' || isNavigatingRef.current) return;
        swipeStartRef.current = { x: event.clientX, y: event.clientY };
        setDragTransitionEnabled(false);
    }, []);

    const handleSwipeMove = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const start = swipeStartRef.current;
            if (!start) return;

            const deltaX = event.clientX - start.x;
            const deltaY = event.clientY - start.y;
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
                    className="motion-gallery-media relative h-[70vh] w-full touch-pan-y overflow-hidden"
                    style={
                        {
                            transform: `translateX(${dragX}px)`,
                            transition: dragTransitionEnabled ? `transform ${SWIPE_TRANSITION_MS}ms var(--motion-ease-standard)` : 'none',
                            '--gallery-media-enter-offset': enterOffset,
                        } as CSSProperties
                    }
                    onPointerDown={handleSwipeStart}
                    onPointerMove={handleSwipeMove}
                    onPointerUp={handleSwipeEnd}
                    onPointerCancel={handleSwipeCancel}
                >
                    {media.mediaType === 'VIDEO' ? (
                        <video src={media.mediaUrl} controls playsInline className="h-full w-full object-contain" />
                    ) : (
                        <ProtectedImage src={media.mediaUrl} alt={media.originalFilename} fill sizes="100vw" className="object-contain" />
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
