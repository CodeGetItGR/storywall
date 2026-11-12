'use client';

import { type RefObject, useEffect } from 'react';

// How far a finger may move and still be a tap, not a scroll.
const TAP_SLOP = 10;

// A tap on the canvas outside every text ends editing. Taps on the toolbar, its popovers,
// the top bar and the panels don't: they sit outside the canvas. Only a tap counts: a scroll
// that starts on a photo moves or is taken over by the browser, so the keyboard stays open.
export function useDeactivateOnOutsideTap(root: RefObject<HTMLElement | null>, isEditing: boolean, deactivate: () => void) {
    useEffect(() => {
        if (!isEditing) return;
        let press: { id: number; x: number; y: number } | null = null;

        const onPointerDown = (event: PointerEvent) => {
            const target = event.target;
            // A text's spacing handles keep it open too.
            const outside = target instanceof Element && root.current?.contains(target) && !target.closest('[data-smd-text], [data-smd-keep-text]');
            press = outside ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
        };
        const onPointerUp = (event: PointerEvent) => {
            const started = press;
            press = null;
            if (!started || event.pointerId !== started.id) return;
            if (Math.hypot(event.clientX - started.x, event.clientY - started.y) > TAP_SLOP) return;
            deactivate();
        };
        const onPointerCancel = () => {
            press = null;
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerCancel);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerCancel);
        };
    }, [deactivate, isEditing, root]);
}
