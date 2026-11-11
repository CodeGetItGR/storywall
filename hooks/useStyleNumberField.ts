'use client';

import { type ChangeEvent, useCallback, useState } from 'react';

import { readStyleNumber, type StyleField } from '@/lib/invitation/sectionStyleFields';

const show = (value: number | undefined) => (value === undefined ? '' : String(value));

// A size or width in pixels. A number in range applies as it's typed; leaving
// the field keeps it in range, and an empty field follows the theme again.
export function useStyleNumberField(field: StyleField, value: number | undefined, onChange: (value: number | undefined) => void) {
    const [text, setText] = useState(show(value));
    const [stored, setStored] = useState(value);

    if (stored !== value) {
        setStored(value);
        setText(show(value));
    }

    const change = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const raw = event.target.value;
            setText(raw);
            const next = readStyleNumber(field, raw);
            const inRange = raw.trim() === '' || (next !== undefined && next === Number(raw));
            if (inRange && next !== value) onChange(next);
        },
        [field, onChange, value],
    );

    const blur = useCallback(() => {
        const next = readStyleNumber(field, text);
        setText(show(next));
        if (next !== value) onChange(next);
    }, [field, onChange, text, value]);

    return { text, onChange: change, onBlur: blur };
}
