'use client';

import { type CSSProperties, type ElementType, useCallback, useRef } from 'react';

import type { CaretRequest } from '@/hooks/useInlineTextEdit';
import { useTiptapText } from '@/hooks/useTiptapText';
import { cn } from '@/lib/utils';

type ActiveTextProps = {
    textKey: string;
    tag: ElementType;
    className: string;
    style: CSSProperties;
    value: string;
    caret: CaretRequest;
    onElement: (element: HTMLElement | null) => void;
    onChange: (text: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    onDone: () => void;
};

// The text being typed into. Tiptap owns what is inside the element; React only sets its look.
export function ActiveText({ textKey, tag: Tag, className, style, value, caret, onElement, onChange, onUndo, onRedo, onDone }: ActiveTextProps) {
    const host = useRef<HTMLElement | null>(null);
    const setHost = useCallback(
        (element: HTMLElement | null) => {
            host.current = element;
            onElement(element);
        },
        [onElement],
    );
    useTiptapText({ host, value, caret, onChange, onUndo, onRedo, onDone });

    return (
        <Tag
            ref={setHost}
            data-smd-text={textKey}
            // Tiptap adds this class too; React sets the class list, so keep it here.
            className={cn(className, 'ProseMirror smd-text smd-text-active', value === '' && 'smd-text-empty')}
            style={style}
        />
    );
}
