'use client';

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
// datetime-local value. Both keep extra room on the right for the native picker
// arrow or icon, which Android draws right at the padding edge.
export function DateTimeField({ value, onChange, name, min, max, required, disabled, inputClassName, ...aria }: DateTimeFieldProps) {
    const t = useTranslations('Common');
    const field = useDateTimeField({ value, onChange, min, max });

    return (
        <div className="flex min-w-0 gap-2">
            <input
                type="date"
                value={field.date}
                onChange={field.handleDateChange}
                min={field.dateMin}
                max={field.dateMax}
                required={required}
                disabled={disabled}
                aria-invalid={aria['aria-invalid']}
                className={cn(inputClassName, 'min-w-0 flex-3 pr-6')}
            />
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
                className={cn(inputClassName, 'min-w-0 flex-2 pr-6')}
            />
            {name && <input type="hidden" name={name} value={field.combined} />}
        </div>
    );
}
