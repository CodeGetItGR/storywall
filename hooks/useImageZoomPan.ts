'use client';

import type { RefObject, TouchEvent as ReactTouchEvent } from 'react';
import { useCallback, useRef, useState } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MAX_DELAY_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE_PX = 30;

interface Point {
    x: number;
    y: number;
}

type TouchList = ReactTouchEvent<HTMLElement>['touches'];

function touchDistance(touches: TouchList): number {
    return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

function touchMidpoint(touches: TouchList): Point {
    return { x: (touches[0].clientX + touches[1].clientX) / 2, y: (touches[0].clientY + touches[1].clientY) / 2 };
}

function clampAxis(value: number, containerSize: number, scale: number): number {
    const maxOffset = (containerSize * (scale - 1)) / 2;
    return Math.min(maxOffset, Math.max(-maxOffset, value));
}

// Pinch-to-zoom + double-tap-to-zoom + pan for a single media element, scoped to that
// element so it doesn't fight the page-level zoom lock in app/layout.tsx.
export function useImageZoomPan(containerRef: RefObject<HTMLElement | null>) {
    const [scale, setScale] = useState(MIN_SCALE);
    const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });
    const [isTransitionEnabled, setIsTransitionEnabled] = useState(false);

    const pinchStartDistanceRef = useRef<number | null>(null);
    const pinchStartScaleRef = useRef(MIN_SCALE);
    const panStartRef = useRef<Point | null>(null);
    const translateStartRef = useRef<Point>({ x: 0, y: 0 });
    const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

    const isZoomed = scale > MIN_SCALE;

    const reset = useCallback(() => {
        setScale(MIN_SCALE);
        setTranslate({ x: 0, y: 0 });
        setIsTransitionEnabled(false);
        pinchStartDistanceRef.current = null;
        panStartRef.current = null;
        lastTapRef.current = null;
    }, []);

    const applyZoom = useCallback(
        (nextScale: number, anchor: Point) => {
            const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
            setScale(clampedScale);

            if (clampedScale === MIN_SCALE) {
                setTranslate({ x: 0, y: 0 });
                return;
            }

            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const offsetX = (rect.width / 2 - (anchor.x - rect.left)) * (clampedScale - 1);
            const offsetY = (rect.height / 2 - (anchor.y - rect.top)) * (clampedScale - 1);
            setTranslate({
                x: clampAxis(offsetX, rect.width, clampedScale),
                y: clampAxis(offsetY, rect.height, clampedScale),
            });
        },
        [containerRef]
    );

    const handleTouchStart = useCallback(
        (event: ReactTouchEvent<HTMLElement>) => {
            if (event.touches.length === 2) {
                setIsTransitionEnabled(false);
                pinchStartDistanceRef.current = touchDistance(event.touches);
                pinchStartScaleRef.current = scale;
                panStartRef.current = null;
                return;
            }

            if (event.touches.length !== 1) return;

            const touch = event.touches[0];
            const now = Date.now();
            const lastTap = lastTapRef.current;
            const isDoubleTap =
                !!lastTap &&
                now - lastTap.time < DOUBLE_TAP_MAX_DELAY_MS &&
                Math.hypot(touch.clientX - lastTap.x, touch.clientY - lastTap.y) < DOUBLE_TAP_MAX_DISTANCE_PX;

            if (isDoubleTap) {
                lastTapRef.current = null;
                setIsTransitionEnabled(true);
                if (isZoomed) {
                    setScale(MIN_SCALE);
                    setTranslate({ x: 0, y: 0 });
                } else {
                    applyZoom(DOUBLE_TAP_SCALE, { x: touch.clientX, y: touch.clientY });
                }
                return;
            }

            lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };

            if (isZoomed) {
                setIsTransitionEnabled(false);
                panStartRef.current = { x: touch.clientX, y: touch.clientY };
                translateStartRef.current = translate;
            }
        },
        [applyZoom, isZoomed, scale, translate]
    );

    const handleTouchMove = useCallback(
        (event: ReactTouchEvent<HTMLElement>) => {
            if (event.touches.length === 2 && pinchStartDistanceRef.current !== null) {
                const distance = touchDistance(event.touches);
                const nextScale = pinchStartScaleRef.current * (distance / pinchStartDistanceRef.current);
                applyZoom(nextScale, touchMidpoint(event.touches));
                return;
            }

            if (event.touches.length === 1 && panStartRef.current && isZoomed) {
                const touch = event.touches[0];
                const rect = containerRef.current?.getBoundingClientRect();
                const nextX = translateStartRef.current.x + (touch.clientX - panStartRef.current.x);
                const nextY = translateStartRef.current.y + (touch.clientY - panStartRef.current.y);
                setTranslate({
                    x: rect ? clampAxis(nextX, rect.width, scale) : nextX,
                    y: rect ? clampAxis(nextY, rect.height, scale) : nextY,
                });
            }
        },
        [applyZoom, containerRef, isZoomed, scale]
    );

    const handleTouchEnd = useCallback(
        (event: ReactTouchEvent<HTMLElement>) => {
            if (event.touches.length < 2) pinchStartDistanceRef.current = null;
            if (event.touches.length === 0) {
                panStartRef.current = null;
                if (scale <= MIN_SCALE) {
                    setIsTransitionEnabled(true);
                    setScale(MIN_SCALE);
                    setTranslate({ x: 0, y: 0 });
                }
            }
        },
        [scale]
    );

    return {
        scale,
        translate,
        isZoomed,
        isTransitionEnabled,
        reset,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
    };
}
