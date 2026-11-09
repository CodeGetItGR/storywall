'use client';

import { type RefObject, useEffect } from 'react';

// A tap on the canvas outside every text ends editing. Taps on the toolbar, its popovers,
// the top bar and the panels don't: they sit outside the canvas.
export function useDeactivateOnOutsideTap(root: RefObject<HTMLElement | null>, isEditing: boolean, deactivate: () => void) {
    useEffect(() => {
        if (!isEditing) return;
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Element) || !root.current?.contains(target)) return;
            if (target.closest('[data-smd-text]')) return;
            deactivate();
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [deactivate, isEditing, root]);
}
