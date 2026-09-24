'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { useRadioGroupKeys } from '@/hooks/useRadioGroupKeys';
import { cn } from '@/lib/utils';

type DurationPickerOption = { id: string; months: number };

// Marketing cards (landing, plan step) spell each length out as plain text and
// underline the pick like the landing's category tabs. Each option reserves its
// bold width (the hidden ::after copy) so the row doesn't shift when the pick
// moves. The app skin keeps a compact pill switch on the theme tokens.
const VARIANT_CLASSES = {
    marketing: {
        group: 'gap-5',
        option: 'relative inline-grid min-h-11 content-center rounded-sm text-sm font-medium before:absolute before:inset-x-0 before:bottom-1.5 before:h-0.75 before:rounded-full after:invisible after:h-0 after:overflow-hidden after:font-bold after:content-[attr(data-label)]',
        selected: 'font-bold text-[#151313] before:bg-[linear-gradient(90deg,#df7794,#f2c764)]',
        idle: 'text-[#151313]/65 hover:text-[#151313]',
        text: 'text-[#151313]/65',
    },
    app: {
        group: 'rounded-full bg-surface-muted p-0.5',
        option: 'min-h-9 min-w-11 rounded-full px-3 text-[13px] font-bold',
        selected: 'bg-ink text-white',
        idle: 'text-ink-muted hover:text-ink',
        text: 'text-ink-muted',
    },
} as const;

// Marketing cards have room to spell each length out; app rows keep "3m".
const OPTION_TEXT_KEY = { marketing: 'months', app: 'short' } as const;

// The lengths a plan is sold at, as a switch. A plan sold at one length only
// shows it as text.
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
            className={cn('inline-flex max-w-full', classes.group, disabled && 'opacity-50', className)}
        >
            {options.map((option, index) => {
                const isSelected = option.id === value;
                const optionText = t(OPTION_TEXT_KEY[variant], { count: option.months });
                return (
                    <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={t('months', { count: option.months })}
                        data-radio-id={option.id}
                        data-label={optionText}
                        tabIndex={isSelected || (!valueOnSale && index === 0) ? 0 : -1}
                        disabled={disabled}
                        onClick={handleClick}
                        className={cn(
                            classes.option,
                            'focus-ring transition-colors disabled:cursor-not-allowed',
                            isSelected ? classes.selected : classes.idle,
                        )}
                    >
                        {optionText}
                    </button>
                );
            })}
        </div>
    );
}
