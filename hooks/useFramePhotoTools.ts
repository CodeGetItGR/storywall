'use client';

import { useGesture } from '@use-gesture/react';
import { type KeyboardEvent, useCallback, useEffect, useRef } from 'react';

import { type DragDelta, nextGestureKey, useDragHandle } from '@/hooks/useDragHandle';
import type { InvitationEditorState } from '@/lib/invitation/editorStore';
import type { PhotoFrameElement } from '@/lib/invitation/photoFrame';
import {
    clampFrameZoom,
    FRAME_ZOOM,
    pannedPosition,
    type PhotoPosition,
    POSITION_KEY_STEP,
    setFramePosition,
    setFrameZoom,
    steppedPercent,
} from '@/lib/invitation/photoFrameEdits';

type Edit = InvitationEditorState['edit'];
type PanStart = PhotoPosition & { key: string; width: number; height: number };

// How much one wheel notch (100px of scroll) zooms.
const WHEEL_ZOOM_PER_PX = 0.0015;

const ARROWS: Record<string, { x: number; y: number }> = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
};

// Moving and zooming the photo inside a frame, as the old editor did. A mouse or
// pen drags the photo itself; on a phone a swipe scrolls the page, so the move
// button drags it and two fingers zoom. The wheel and the buttons zoom too.
export function useFramePhotoTools(element: PhotoFrameElement, edit: Edit) {
    const surfaceRef = useRef<HTMLDivElement>(null);
    const latest = useRef(element);
    useEffect(() => {
        latest.current = element;
    });
    const id = element.id;

    const startPan = useCallback((): PanStart | null => {
        const box = surfaceRef.current?.getBoundingClientRect();
        if (!box) return null;
        const { imageX, imageY } = latest.current;
        return { imageX, imageY, width: box.width, height: box.height, key: nextGestureKey(`frame-pan:${id}`) };
    }, [id]);

    const pan = useCallback(
        (delta: DragDelta, from: PanStart) => {
            edit((draft) => setFramePosition(draft, id, pannedPosition(from, delta, from)), from.key, { gesture: true });
        },
        [edit, id],
    );

    const zoomTo = useCallback(
        (zoom: number, key?: string) => {
            edit((draft) => setFrameZoom(draft, id, zoom), key, key ? { gesture: true } : undefined);
        },
        [edit, id],
    );

    const zoomKey = useRef('');

    useGesture(
        {
            onDrag: ({ first, movement: [x, y], event, memo, cancel }) => {
                // A finger on the photo scrolls the page; only the move button moves it.
                if ('pointerType' in event && event.pointerType === 'touch') {
                    cancel();
                    return memo;
                }
                const from: PanStart | null = first ? startPan() : memo;
                if (from) pan({ x, y }, from);
                return from;
            },
            onPinch: ({ first, offset: [scale], event }) => {
                event.preventDefault();
                if (first) zoomKey.current = nextGestureKey(`frame-zoom:${id}`);
                zoomTo(scale, zoomKey.current);
            },
            onWheel: ({ first, delta: [, deltaY], event }) => {
                // A trackpad pinch arrives as a wheel with Ctrl held; the pinch handles it.
                if (event.ctrlKey) return;
                event.preventDefault();
                if (first) zoomKey.current = nextGestureKey(`frame-zoom:${id}`);
                zoomTo(clampFrameZoom(latest.current.zoom - deltaY * WHEEL_ZOOM_PER_PX), zoomKey.current);
            },
        },
        {
            target: surfaceRef,
            eventOptions: { passive: false },
            drag: { filterTaps: true },
            pinch: { scaleBounds: { min: FRAME_ZOOM.min, max: FRAME_ZOOM.max }, from: () => [Math.max(FRAME_ZOOM.min, latest.current.zoom), 0] },
        },
    );

    const move = useDragHandle({ start: startPan, move: pan });

    // The arrow keys move the photo on the move button, each axis on its own.
    const onMoveKeyDown = useCallback(
        (event: KeyboardEvent<HTMLElement>) => {
            const arrow = ARROWS[event.key];
            if (!arrow) return;
            event.preventDefault();
            const step = POSITION_KEY_STEP * (event.shiftKey ? 2 : 1);
            const { imageX, imageY } = latest.current;
            edit(
                (draft) =>
                    setFramePosition(draft, id, { imageX: steppedPercent(imageX, arrow.x * step), imageY: steppedPercent(imageY, arrow.y * step) }),
                `frame-pan:${id}:keys`,
            );
        },
        [edit, id],
    );

    const zoom = Math.max(FRAME_ZOOM.min, element.zoom);
    const zoomIn = useCallback(() => zoomTo(clampFrameZoom(latest.current.zoom + FRAME_ZOOM.step)), [zoomTo]);
    const zoomOut = useCallback(() => zoomTo(clampFrameZoom(latest.current.zoom - FRAME_ZOOM.step)), [zoomTo]);

    return {
        surfaceRef,
        move: { isDragging: move.isDragging, handlers: { ...move.handlers, onKeyDown: onMoveKeyDown } },
        zoomIn,
        zoomOut,
        canZoomIn: zoom < FRAME_ZOOM.max,
        canZoomOut: zoom > FRAME_ZOOM.min,
    };
}
