import { type ChangeEvent, useCallback, useState } from 'react';

import { joinDatetimeLocalValue, splitDatetimeLocalValue } from '@/lib/datetime';

interface UseDateTimeFieldOptions {
    value?: string;
    onChange?: (value: string) => void;
    min?: string;
    max?: string;
}

// Drives a date input and a time input as one datetime-local value
// ("YYYY-MM-DDTHH:mm"). Separate pickers keep a time change from moving the
// day, which a phone's combined date-and-time wheel does. A half-filled pair
// is kept locally and reported as an empty value.
export function useDateTimeField({ value, onChange, min, max }: UseDateTimeFieldOptions) {
    const [draft, setDraft] = useState(() => splitDatetimeLocalValue(value));
    const isControlled = value !== undefined;
    const parts = isControlled && value ? splitDatetimeLocalValue(value) : draft;
    const combined = joinDatetimeLocalValue(parts.date, parts.time);

    const update = useCallback(
        (next: { date: string; time: string }) => {
            setDraft(next);
            onChange?.(joinDatetimeLocalValue(next.date, next.time));
        },
        [onChange],
    );

    const handleDateChange = useCallback((event: ChangeEvent<HTMLInputElement>) => update({ ...parts, date: event.target.value }), [parts, update]);
    const handleTimeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => update({ ...parts, time: event.target.value }), [parts, update]);

    const minParts = splitDatetimeLocalValue(min);
    const maxParts = splitDatetimeLocalValue(max);

    return {
        date: parts.date,
        time: parts.time,
        combined,
        dateMin: minParts.date || undefined,
        dateMax: maxParts.date || undefined,
        // A time bound only applies on the bounding day itself.
        timeMin: parts.date && parts.date === minParts.date ? minParts.time : undefined,
        timeMax: parts.date && parts.date === maxParts.date ? maxParts.time : undefined,
        handleDateChange,
        handleTimeChange,
    };
}
