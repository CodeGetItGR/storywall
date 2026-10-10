'use client';

import { PiBalloonFill } from 'react-icons/pi';

import type { HeOrSheValue } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const TONES: Record<HeOrSheValue, { button: string; icon: string }> = {
    HE: { button: 'text-sky-800 ring-sky-200 hover:ring-sky-300 hover:shadow-sky-200/70', icon: 'text-sky-400' },
    SHE: { button: 'text-pink-800 ring-pink-200 hover:ring-pink-300 hover:shadow-pink-200/70', icon: 'text-pink-400' },
};

/** One balloon pill on the feed prompt. */
export function HeOrShePromptChoice({
    value,
    label,
    disabled,
    onChooseAction,
}: {
    value: HeOrSheValue;
    label: string;
    disabled: boolean;
    onChooseAction: (value: HeOrSheValue) => void;
}) {
    function choose() {
        onChooseAction(value);
    }

    return (
        <button
            type="button"
            onClick={choose}
            disabled={disabled}
            className={cn(
                'group flex items-center justify-center gap-2 rounded-full bg-white/85 px-4 py-3 text-base font-semibold shadow-sm ring-1 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0',
                TONES[value].button,
            )}
        >
            <PiBalloonFill className={cn('h-5 w-5 transition-transform group-hover:-rotate-6', TONES[value].icon)} aria-hidden="true" />
            {label}
        </button>
    );
}
