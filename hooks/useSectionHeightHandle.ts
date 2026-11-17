'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { nextGestureKey, useDragHandle } from '@/hooks/useDragHandle';
import { draggedSectionSize, hasSavedSize, resetSectionSize, setSectionSize } from '@/lib/invitation/canvasHandles';
import type { InvitationEditorState } from '@/lib/invitation/editorStore';
import type { InvitationSection } from '@/lib/invitation/sections';

type SectionStart = { height: number; content: number; key: string };

// The rendered section of the frame the handle sits in.
function sectionElement(handle: HTMLElement | null, sectionId: string): HTMLElement | null {
    const frame = handle?.closest('[data-editor-section]');
    return frame?.querySelector<HTMLElement>(`[data-section-id="${sectionId}"]`) ?? null;
}

// How tall the content is without the section's saved height: the old editor measured
// its inner block, so the section never shrinks past what it holds.
function contentHeight(section: HTMLElement): number {
    const inner = section.querySelector<HTMLElement>('.section-inner');
    if (inner) return Math.ceil(inner.scrollHeight);
    const style = getComputedStyle(section);
    return Math.max(0, section.getBoundingClientRect().height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
}

// The bar under a section that drags its height, and resets it with a double tap.
export function useSectionHeightHandle(section: Pick<InvitationSection, 'id' | 'type' | 'style'>, edit: InvitationEditorState['edit']) {
    const handleRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(0);
    const { id, type } = section;
    const canReset = hasSavedSize(section);

    // The section's height on screen, for the keyboard and screen readers.
    useEffect(() => {
        const element = sectionElement(handleRef.current, id);
        if (!element) return;
        const measure = () => setHeight(Math.round(element.getBoundingClientRect().height));
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [id]);

    const start = useCallback((): SectionStart | null => {
        const element = sectionElement(handleRef.current, id);
        if (!element) return null;
        return { height: element.getBoundingClientRect().height, content: contentHeight(element), key: nextGestureKey(`section-height:${id}`) };
    }, [id]);

    const move = useCallback(
        (delta: { y: number }, from: SectionStart) => {
            edit((draft) => setSectionSize(draft, id, draggedSectionSize(type, from.height, from.content, delta.y)), from.key, { gesture: true });
        },
        [edit, id, type],
    );

    const step = useCallback(
        (amount: number) => {
            const from = start();
            if (!from) return;
            edit((draft) => setSectionSize(draft, id, draggedSectionSize(type, from.height, from.content, amount)), `section-height:${id}:keys`);
        },
        [edit, id, start, type],
    );

    const reset = useCallback(() => {
        if (canReset) edit((draft) => resetSectionSize(draft, id));
    }, [canReset, edit, id]);

    const drag = useDragHandle({ start, move, step, reset });

    return { handleRef, height, isDragging: drag.isDragging, handlers: drag.handlers };
}
