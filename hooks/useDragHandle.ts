'use client';

import { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useRef, useState } from 'react';

export type DragDelta = { x: number; y: number };

export type DragHandlers = ReturnType<typeof useDragHandle>['handlers'];

// A press that moves less than this is a tap: it changes nothing.
export const DRAG_START_SLOP = 4;
// Two taps this close in time and place are a double tap.
export const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_SLOP = 24;
// Arrow keys move one pixel, ten with Shift.
const KEY_STEP = 1;
const KEY_STEP_LARGE = 10;

type DragHandleOptions<S> = {
    // Measures what the drag works from when a press starts. Null cancels the press.
    start: () => S | null;
    // How far the pointer is from where it was pressed, at most once a frame.
    move: (delta: DragDelta, start: S) => void;
    // Arrow keys: +1 or -1 (ten with Shift). Up and right make it bigger.
    step?: (amount: number) => void;
    // A double click or double tap, and the Home key.
    reset?: () => void;
};

type Press<S> = { pointerId: number; x: number; y: number; start: S; delta: DragDelta; moved: boolean; frame: number | null };

const ARROW_STEPS: Record<string, 1 | -1> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 };

// One drag handle: mouse, pen and touch through pointer events, with the pointer
// captured so the drag keeps going outside the handle. Moves are batched to one
// per animation frame, as the old editor did, so a phone keeps up.
export function useDragHandle<S>({ start, move, step, reset }: DragHandleOptions<S>) {
    const press = useRef<Press<S> | null>(null);
    const lastTap = useRef<{ at: number; x: number; y: number } | null>(null);
    const latest = useRef({ start, move, step, reset });
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        latest.current = { start, move, step, reset };
    });

    useEffect(
        () => () => {
            if (press.current?.frame) cancelAnimationFrame(press.current.frame);
        },
        [],
    );

    const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        // Keeps the page from scrolling or selecting text, and the text being edited keeps its focus.
        event.preventDefault();
        const measured = latest.current.start();
        if (measured === null) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        press.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, start: measured, delta: { x: 0, y: 0 }, moved: false, frame: null };
        setIsDragging(true);
    }, []);

    const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
        const current = press.current;
        if (!current || event.pointerId !== current.pointerId) return;
        event.preventDefault();
        current.delta = { x: event.clientX - current.x, y: event.clientY - current.y };
        if (!current.moved && Math.hypot(current.delta.x, current.delta.y) < DRAG_START_SLOP) return;
        current.moved = true;
        if (current.frame !== null) return;
        current.frame = requestAnimationFrame(() => {
            current.frame = null;
            if (press.current === current) latest.current.move(current.delta, current.start);
        });
    }, []);

    const finish = useCallback((event: PointerEvent<HTMLElement>, cancelled: boolean) => {
        const current = press.current;
        if (!current || event.pointerId !== current.pointerId) return;
        press.current = null;
        setIsDragging(false);
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (current.frame !== null) {
            cancelAnimationFrame(current.frame);
            if (!cancelled) latest.current.move(current.delta, current.start);
        }
        if (cancelled || current.moved) {
            lastTap.current = null;
            return;
        }
        const now = Date.now();
        const previous = lastTap.current;
        const isDouble =
            previous !== null && now - previous.at < DOUBLE_TAP_MS && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < DOUBLE_TAP_SLOP;
        lastTap.current = isDouble ? null : { at: now, x: event.clientX, y: event.clientY };
        if (isDouble) latest.current.reset?.();
    }, []);

    const onPointerUp = useCallback((event: PointerEvent<HTMLElement>) => finish(event, false), [finish]);
    const onPointerCancel = useCallback((event: PointerEvent<HTMLElement>) => finish(event, true), [finish]);

    const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
        const { step: onStep, reset: onReset } = latest.current;
        const direction = ARROW_STEPS[event.key];
        if (direction && onStep) {
            event.preventDefault();
            onStep(direction * (event.shiftKey ? KEY_STEP_LARGE : KEY_STEP));
        } else if (event.key === 'Home' && onReset) {
            event.preventDefault();
            onReset();
        }
    }, []);

    return { isDragging, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onKeyDown } };
}

let gestureCount = 0;

// A merge key for one drag: its edits are one undo step, and the next drag is another.
export function nextGestureKey(base: string): string {
    gestureCount += 1;
    return `${base}:drag-${gestureCount}`;
}
