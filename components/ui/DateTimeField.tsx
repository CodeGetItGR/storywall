'use client';

import { CalendarDays, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useDateTimeField } from '@/hooks/useDateTimeField';
import { cn } from '@/lib/utils';

interface DateTimeFieldProps {
    // A datetime-local value ("YYYY-MM-DDTHH:mm"); omit to leave the field uncontrolled.
    value?: string;
    onChange?: (value: string) => void;
    // Submits the joined value under this name, for forms read through FormData.
    name?: string;
    min?: string;
    max?: string;
    required?: boolean;
    disabled?: boolean;
    'aria-invalid'?: boolean;
    inputClassName?: string;
}

// A date input and a time input side by side, read and written as one
// datetime-local value. The native look is turned off: Android draws its picker
// arrow at the field's very edge, ignoring padding, where a rounded corner cuts
// it off. On touch screens our own icon takes its place; desktop browsers keep
// their own picker icon, which respects the padding.
const NATIVE_RESET = cn(
    'relative w-full appearance-none pr-6 pointer-coarse:pr-11',
    // On touch screens the browser's own picker button is stretched invisibly over the whole field,
    // so a tap anywhere still opens the picker and only our icon shows.
    'pointer-coarse:[&::-webkit-calendar-picker-indicator]:absolute pointer-coarse:[&::-webkit-calendar-picker-indicator]:inset-0 pointer-coarse:[&::-webkit-calendar-picker-indicator]:h-auto pointer-coarse:[&::-webkit-calendar-picker-indicator]:w-auto pointer-coarse:[&::-webkit-calendar-picker-indicator]:opacity-0',
);
const ICON_CLASS = 'pointer-events-none absolute top-1/2 right-4 hidden size-4 -translate-y-1/2 text-ink-muted pointer-coarse:block';

export function DateTimeField({ value, onChange, name, min, max, required, disabled, inputClassName, ...aria }: DateTimeFieldProps) {
    const t = useTranslations('Common');
    const field = useDateTimeField({ value, onChange, min, max });

    return (
        <div className="flex min-w-0 gap-2">
            {/* Date */}
            <div className="relative min-w-0 flex-3">
                <input
                    type="date"
                    value={field.date}
                    onChange={field.handleDateChange}
                    min={field.dateMin}
                    max={field.dateMax}
                    required={required}
                    disabled={disabled}
                    aria-invalid={aria['aria-invalid']}
                    className={cn(inputClassName, NATIVE_RESET)}
                />
                <CalendarDays aria-hidden="true" className={ICON_CLASS} />
            </div>

            {/* Time */}
            <div className="relative min-w-0 flex-2">
                <input
                    type="time"
                    value={field.time}
                    onChange={field.handleTimeChange}
                    min={field.timeMin}
                    max={field.timeMax}
                    required={required}
                    disabled={disabled}
                    aria-label={t('time')}
                    aria-invalid={aria['aria-invalid']}
                    className={cn(inputClassName, NATIVE_RESET)}
                />
                <Clock aria-hidden="true" className={ICON_CLASS} />
            </div>
            {name && <input type="hidden" name={name} value={field.combined} />}
        </div>
    );
}
