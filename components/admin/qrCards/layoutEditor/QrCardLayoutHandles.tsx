import type { PointerEvent } from 'react';

import { handlePoint, handlesFor, type QrCardElement, type QrCardHandle, type Rect } from '@/lib/qrCardLayout';

// Handle squares, in mm on the card. Small enough not to cover text, big enough for a mouse.
const HANDLE_SIZE = 2.4;
const CURSORS: Record<QrCardHandle, string> = {
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
    nw: 'nwse-resize',
    se: 'nwse-resize',
};

// The selected element's resize handles. Mouse only: the keyboard moves elements, and sizes are set
// in the side panel or by mouse.
export function QrCardLayoutHandles({
    element,
    rect,
    onPointerDownAction,
}: {
    element: QrCardElement;
    rect: Rect;
    onPointerDownAction: (event: PointerEvent<SVGElement>) => void;
}) {
    return (
        <g className="text-primary">
            {handlesFor(element).map((handle) => {
                const point = handlePoint(rect, handle);
                return (
                    <rect
                        key={handle}
                        data-element={element}
                        data-handle={handle}
                        x={point.x - HANDLE_SIZE / 2}
                        y={point.y - HANDLE_SIZE / 2}
                        width={HANDLE_SIZE}
                        height={HANDLE_SIZE}
                        rx={0.4}
                        fill="#FFFFFF"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                        style={{ cursor: CURSORS[handle] }}
                        onPointerDown={onPointerDownAction}
                    />
                );
            })}
        </g>
    );
}
