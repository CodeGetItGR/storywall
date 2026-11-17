'use client';

import type { CSSProperties, ElementType } from 'react';

import { useLockedActiveText } from '@/hooks/useLockedActiveText';
import { cn } from '@/lib/utils';

type LockedActiveTextProps = {
    textKey: string;
    tag: ElementType;
    className: string;
    style: CSSProperties;
    value: string;
    onElement: (element: HTMLElement | null) => void;
    onDone: () => void;
};

// An open text whose words come from the event (KAN-84): the toolbar changes its look, nothing types into it.
export function LockedActiveText({ textKey, tag: Tag, className, style, value, onElement, onDone }: LockedActiveTextProps) {
    const { setHost, onKeyDown } = useLockedActiveText(onElement, onDone);

    return (
        <Tag
            ref={setHost}
            data-smd-text={textKey}
            data-smd-locked=""
            tabIndex={-1}
            className={cn(className, 'smd-text smd-text-active')}
            style={style}
            onKeyDown={onKeyDown}
        >
            {value}
        </Tag>
    );
}
