'use client';

import { type Dispatch, type PointerEvent, type SetStateAction, useCallback, useRef, useState } from 'react';

import { QR_CARD_HEIGHT, QR_CARD_WIDTH } from '@/lib/qrCard';
import {
    elementRect,
    moveElementTo,
    type Point,
    type QrCardElement,
    type QrCardGuide,
    type QrCardHandle,
    type QrCardLayout,
    type Rect,
    resizeElement,
    snapPosition,
} from '@/lib/qrCardLayout';

type Drag = { element: QrCardElement; handle: QrCardHandle | null; pointerId: number; startPoint: Point; startRect: Rect };

// Dragging and resizing on the editor's overlay, in card millimetres. Elements and handles name
// themselves with data-element and data-handle; the overlay <svg> gets the move, up and cancel
// events (pointer capture retargets them to the pressed element, and they bubble up to it).
// Holding Alt turns snapping off.
export function useQrCardLayoutPointer({
    layout,
    setLayout,
    select,
}: {
    layout: QrCardLayout;
    setLayout: Dispatch<SetStateAction<QrCardLayout>>;
    select: (element: QrCardElement) => void;
}) {
    const overlayRef = useRef<SVGSVGElement | null>(null);
    const drag = useRef<Drag | null>(null);
    const [guides, setGuides] = useState<QrCardGuide[]>([]);

    const toCard = useCallback((event: PointerEvent<SVGElement>): Point => {
        const box = overlayRef.current?.getBoundingClientRect();
        if (!box || box.width === 0 || box.height === 0) return { x: 0, y: 0 };
        return { x: ((event.clientX - box.left) / box.width) * QR_CARD_WIDTH, y: ((event.clientY - box.top) / box.height) * QR_CARD_HEIGHT };
    }, []);

    const handlePointerDown = useCallback(
        (event: PointerEvent<SVGElement>) => {
            const element = event.currentTarget.dataset.element as QrCardElement | undefined;
            if (event.button !== 0 || !element) return;
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            select(element);
            drag.current = {
                element,
                handle: (event.currentTarget.dataset.handle as QrCardHandle | undefined) ?? null,
                pointerId: event.pointerId,
                startPoint: toCard(event),
                startRect: elementRect(layout, element),
            };
        },
        [layout, select, toCard],
    );

    const handlePointerMove = useCallback(
        (event: PointerEvent<SVGSVGElement>) => {
            const current = drag.current;
            if (!current || current.pointerId !== event.pointerId) return;
            const point = toCard(event);
            const dx = point.x - current.startPoint.x;
            const dy = point.y - current.startPoint.y;
            if (current.handle) {
                setLayout(resizeElement(layout, current.element, current.handle, current.startRect, dx, dy));
                return;
            }
            const to = { x: current.startRect.x + dx, y: current.startRect.y + dy };
            const snapped = event.altKey ? { ...to, guides: [] } : snapPosition(layout, current.element, to);
            setGuides(snapped.guides);
            setLayout(moveElementTo(layout, current.element, snapped));
        },
        [layout, setLayout, toCard],
    );

    const handlePointerEnd = useCallback((event: PointerEvent<SVGSVGElement>) => {
        if (drag.current?.pointerId !== event.pointerId) return;
        drag.current = null;
        setGuides([]);
    }, []);

    return { overlayRef, guides, handlePointerDown, handlePointerMove, handlePointerEnd };
}

export type QrCardLayoutPointer = ReturnType<typeof useQrCardLayoutPointer>;
