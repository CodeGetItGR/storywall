'use client';

import { type FocusEvent, type MouseEvent, type PointerEvent, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import { placeInfoTip } from '@/lib/adminInfoTip';

// A keyboard focus opens the tip; a mouse click that only focuses the button does not.
function isKeyboardFocus(element: Element) {
    try {
        return element.matches(':focus-visible');
    } catch {
        return true;
    }
}

// Open state and behaviour of a tip: hover (mouse), keyboard focus and tap open it; Escape, a press
// anywhere else, a resize, or a scroll that moves the trigger close it. The bubble is placed under the
// trigger, inside the viewport. A tip of its own (an "i", an icon) wires `handleClick`: a tap toggles
// it and never reaches the row around it. A control with a click of its own (a toggle, a chip, a row)
// wires `handlePointerUp` instead, so a tap opens the tip and the control still does its job.
export function useAdminInfoTip<T extends HTMLElement = HTMLButtonElement>() {
    const id = useId();
    const triggerRef = useRef<T>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const anchor = useRef<DOMRect | null>(null);
    const [open, setOpen] = useState(false);

    useLayoutEffect(() => {
        const trigger = triggerRef.current;
        const bubble = bubbleRef.current;
        if (!open || !trigger || !bubble) return;
        const rect = trigger.getBoundingClientRect();
        const { top, left } = placeInfoTip(rect, bubble.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight });
        bubble.style.top = `${top}px`;
        bubble.style.left = `${left}px`;
        anchor.current = rect;
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        // Capture on window, so Escape closes the tip before a drawer or dialog around it sees the key.
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            close();
        };
        const handlePointerDown = (event: globalThis.PointerEvent) => {
            if (!triggerRef.current?.contains(event.target as Node)) close();
        };
        // A scroll that leaves the trigger where it was (a focus scrolling it into view) keeps the tip.
        const handleScroll = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            const before = anchor.current;
            if (!rect || !before || Math.abs(rect.top - before.top) > 1 || Math.abs(rect.left - before.left) > 1) close();
        };
        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('pointerdown', handlePointerDown, true);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('pointerdown', handlePointerDown, true);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', close);
        };
    }, [open]);

    const handlePointerEnter = useCallback((event: PointerEvent<T>) => {
        if (event.pointerType === 'mouse') setOpen(true);
    }, []);
    const handlePointerLeave = useCallback((event: PointerEvent<T>) => {
        if (event.pointerType === 'mouse') setOpen(false);
    }, []);
    // A tap on a control: open, and leave the click to the control.
    const handlePointerUp = useCallback((event: PointerEvent<T>) => {
        if (event.pointerType !== 'mouse') setOpen(true);
    }, []);
    // The focused element is the trigger itself, or the checkbox inside a chip's label.
    const handleFocus = useCallback((event: FocusEvent<T>) => {
        if (isKeyboardFocus(event.target as Element)) setOpen(true);
    }, []);
    const handleBlur = useCallback(() => setOpen(false), []);
    const handleClick = useCallback((event: MouseEvent<T>) => {
        // Never reaches a header's own handlers (sorting, row clicks).
        event.stopPropagation();
        // A mouse is already hovering, which opened it: a click keeps it open instead of closing it.
        const fromMouse = (event.nativeEvent as globalThis.PointerEvent).pointerType === 'mouse';
        setOpen((current) => fromMouse || !current);
    }, []);

    return {
        id,
        open,
        triggerRef,
        bubbleRef,
        handlers: { handlePointerEnter, handlePointerLeave, handlePointerUp, handleFocus, handleBlur, handleClick },
    };
}
