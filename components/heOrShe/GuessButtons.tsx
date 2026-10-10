'use client';

import { useTranslations } from 'next-intl';
import type React from 'react';

import type { HeOrSheValue } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const OPTIONS: { value: HeOrSheValue; tone: string; selected: string }[] = [
    { value: 'HE', tone: 'border-sky-200 bg-sky-50 text-sky-700', selected: 'border-sky-500 bg-sky-100 ring-2 ring-sky-300' },
    { value: 'SHE', tone: 'border-pink-200 bg-pink-50 text-pink-700', selected: 'border-pink-500 bg-pink-100 ring-2 ring-pink-300' },
];

/** Boy / Girl as two big toggle buttons. {@code size="sm"} for compact use in forms. */
export function GuessButtons({
    value,
    onChangeAction,
    disabled = false,
    size = 'lg',
    label,
}: {
    value: HeOrSheValue | null;
    onChangeAction: (value: HeOrSheValue) => void;
    disabled?: boolean;
    size?: 'lg' | 'sm';
    label: string;
}) {
    const t = useTranslations('HeOrShePage');
    function choose(event: React.MouseEvent<HTMLButtonElement>) {
        onChangeAction(event.currentTarget.dataset.value as HeOrSheValue);
    }
    return (
        <div role="group" aria-label={label} className="grid grid-cols-2 gap-3">
            {OPTIONS.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={value === option.value}
                    disabled={disabled}
                    data-value={option.value}
                    onClick={choose}
                    className={cn(
                        'rounded-2xl border-2 font-semibold transition-all disabled:opacity-60',
                        size === 'lg' ? 'py-6 text-lg' : 'py-2.5 text-sm',
                        option.tone,
                        value === option.value && option.selected,
                    )}
                >
                    {option.value === 'HE' ? t('he') : t('she')}
                </button>
            ))}
        </div>
    );
}
