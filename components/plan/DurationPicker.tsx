'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { useRadioGroupKeys } from '@/hooks/useRadioGroupKeys';
import { cn } from '@/lib/utils';

type DurationPickerOption = { id: string; months: number };

// Marketing cards (landing, plan step) use their own fixed ink; the app skin
// uses the theme tokens.
const VARIANT_CLASSES = {
    marketing: {
        track: 'bg-[#151313]/[.06]',
        selected: 'bg-[#151313] text-white',
        idle: 'text-[#151313]/70 hover:text-[#151313]',
        text: 'text-[#151313]/65',
    },
    app: {
        track: 'bg-surface-muted',
        selected: 'bg-ink text-white',
        idle: 'text-ink-muted hover:text-ink',
        text: 'text-ink-muted',
    },
} as const;

// The lengths a plan is sold at, as a compact "3m | 6m | 9m" switch. A plan
// sold at one length only shows it as text.
export function DurationPicker({
    options,
    value,
    onChangeAction,
    variant = 'app',
    disabled = false,
    labelledBy,
    className,
}: {
    options: DurationPickerOption[];
    value: string | null;
    onChangeAction: (optionId: string) => void;
    variant?: keyof typeof VARIANT_CLASSES;
    disabled?: boolean;
    // Id of a visible label that names the switch; falls back to a generic one.
    labelledBy?: string;
    className?: string;
}) {
    const t = useTranslations('Durations');
    const classes = VARIANT_CLASSES[variant];
    const valueOnSale = options.some((option) => option.id === value);
    const handleKeyDown = useRadioGroupKeys(
        options.map((option) => option.id),
        value,
        onChangeAction,
    );

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const { radioId } = event.currentTarget.dataset;
        if (radioId) onChangeAction(radioId);
    }

    if (options.length === 0) return null;

    // Single duration (still a switch while the current value is off sale, so it can be picked)
    if (options.length === 1 && (valueOnSale || !value)) {
        return <p className={cn('text-sm font-semibold', classes.text, className)}>{t('months', { count: options[0].months })}</p>;
    }

    // Duration switch
    return (
        <div
            role="radiogroup"
            aria-label={labelledBy ? undefined : t('label')}
            aria-labelledby={labelledBy}
            aria-disabled={disabled || undefined}
            onKeyDown={disabled ? undefined : handleKeyDown}
            className={cn('inline-flex max-w-full rounded-full p-0.5', classes.track, disabled && 'opacity-50', className)}
        >
            {options.map((option, index) => {
                const isSelected = option.id === value;
                return (
                    <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={t('months', { count: option.months })}
                        data-radio-id={option.id}
                        tabIndex={isSelected || (!valueOnSale && index === 0) ? 0 : -1}
                        disabled={disabled}
                        onClick={handleClick}
                        className={cn(
                            'min-h-9 min-w-11 rounded-full px-3 text-[13px] font-bold focus-ring transition-colors disabled:cursor-not-allowed',
                            isSelected ? classes.selected : classes.idle,
                        )}
                    >
                        {t('short', { count: option.months })}
                    </button>
                );
            })}
        </div>
    );
}
