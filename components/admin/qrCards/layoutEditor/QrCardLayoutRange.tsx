'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type ChangeEvent, useId } from 'react';

import { formatMm } from '@/lib/adminQrCards';

// A labelled slider in 0.5 mm steps, its value shown in millimetres.
export function QrCardLayoutRange({
    label,
    value,
    min,
    max,
    disabled = false,
    onChangeAction,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    disabled?: boolean;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('AdminPage.qrCards.layout');
    const locale = useLocale();
    const id = useId();

    return (
        <div className="space-y-1.5">
            {/* Label */}
            <div className="flex items-center justify-between gap-2">
                <label htmlFor={id} className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">
                    {label}
                </label>
                <span className="font-mono text-xs text-ink">{t('mm', { value: formatMm(value, locale) })}</span>
            </div>
            {/* Slider */}
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={0.5}
                value={value}
                disabled={disabled}
                onChange={onChangeAction}
                className="w-full accent-primary disabled:opacity-50"
            />
        </div>
    );
}
