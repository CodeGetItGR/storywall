'use client';

import { useCallback, useLayoutEffect, useState } from 'react';

import { type DragDelta, nextGestureKey, useDragHandle } from '@/hooks/useDragHandle';
import { clampTo, TEXT_SPACING } from '@/lib/invitation/canvasHandles';
import type { InvitationEditorState } from '@/lib/invitation/editorStore';
import type { TextStyle } from '@/lib/invitation/primitives';
import { textMergeKey, type TextTarget, writeStyle } from '@/lib/invitation/textEditing';

export type TextEdge = 'top' | 'bottom';

// The dashed outline sits this far outside a text, and the bars sit on it.
const OUTLINE_OFFSET = 4;

export type TextHandlePlaces = { frame: HTMLElement; x: number; top: number; bottom: number };

type MeasuredPlaces = TextHandlePlaces & { text: HTMLElement };

// Where the two bars go, in the section frame's own coordinates, kept up to date
// while the text changes size or moves.
export function useTextHandlePlaces(element: HTMLElement | null, style: TextStyle | undefined): TextHandlePlaces | null {
    const [places, setPlaces] = useState<MeasuredPlaces | null>(null);

    useLayoutEffect(() => {
        const frame = element?.closest<HTMLElement>('[data-editor-section]');
        if (!element || !frame) return;
        const measure = () => {
            const text = element.getBoundingClientRect();
            const box = frame.getBoundingClientRect();
            setPlaces({
                text: element,
                frame,
                x: text.left - box.left + text.width / 2,
                top: text.top - box.top - OUTLINE_OFFSET,
                bottom: text.bottom - box.top + OUTLINE_OFFSET,
            });
        };
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        observer.observe(frame);
        return () => observer.disconnect();
        // The style is what a drag changes: measure again after each one.
    }, [element, style]);

    // Places measured for a text that is no longer the one being edited don't count.
    return places && places.text === element ? places : null;
}

const MARGIN: Record<TextEdge, 'marginTop' | 'marginBottom'> = { top: 'marginTop', bottom: 'marginBottom' };

// The space a text keeps on one side: its own setting, else what it shows now.
function currentSpace(element: HTMLElement, style: TextStyle | undefined, edge: TextEdge): number {
    const saved = style?.[MARGIN[edge]];
    if (saved !== undefined) return saved;
    return Math.round(parseFloat(getComputedStyle(element)[MARGIN[edge]]) || 0);
}

type SpaceStart = { value: number; key: string };

// One bar: dragging down adds space on its side of the text, up takes it away.
export function useTextSpacingHandle(
    element: HTMLElement,
    target: TextTarget,
    style: TextStyle | undefined,
    edge: TextEdge,
    edit: InvitationEditorState['edit'],
) {
    const prop = MARGIN[edge];
    const value = currentSpace(element, style, edge);

    const write = useCallback(
        (next: number, key: string, gesture: boolean) => {
            edit((draft) => writeStyle(draft, target, { [prop]: clampTo(next, TEXT_SPACING) }), key, { gesture });
        },
        [edit, prop, target],
    );
    const start = useCallback(
        (): SpaceStart => ({ value: currentSpace(element, style, edge), key: nextGestureKey(textMergeKey(target, prop)) }),
        [edge, element, prop, style, target],
    );
    const move = useCallback((delta: DragDelta, from: SpaceStart) => write(Math.round(from.value + delta.y), from.key, true), [write]);
    const step = useCallback((amount: number) => write(value + amount, textMergeKey(target, `${prop}-keys`), false), [prop, target, value, write]);

    const drag = useDragHandle({ start, move, step });
    return { ...drag, value };
}
