'use client';

import type { ChangeEvent, MouseEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { cn } from '@/lib/utils';

const LIMIT_MODES = [false, true] as const;

// "Unlimited" or "Up to N" as one segmented choice, so a blank number field
// never has to mean "no limit".
export function AdminLimitControl({
    label,
    limited,
    value,
    min,
    error,
    unlimitedLabel,
    upToLabel,
    onModeChangeAction,
    onValueChangeAction,
}: {
    label: string;
    limited: boolean;
    value: string;
    min: number;
    error?: string;
    unlimitedLabel: string;
    upToLabel: string;
    onModeChangeAction: (limited: boolean) => void;
    onValueChangeAction: (value: string) => void;
}) {
    function handleModeClick(event: MouseEvent<HTMLButtonElement>) {
        onModeChangeAction(event.currentTarget.dataset.limited === 'true');
    }

    function handleValueChange(event: ChangeEvent<HTMLInputElement>) {
        onValueChangeAction(event.currentTarget.value);
    }

    return (
        <AdminField label={label} hint={error}>
            <div className="flex items-center gap-2">
                {/* Mode */}
                <div className="flex gap-1 rounded-lg bg-canvas p-1">
                    {LIMIT_MODES.map((option) => (
                        <button
                            key={String(option)}
                            type="button"
                            data-limited={String(option)}
                            onClick={handleModeClick}
                            aria-pressed={limited === option}
                            className={cn(
                                'rounded-md px-2.5 py-1.5 text-[12.5px] font-bold transition-colors',
                                limited === option ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                            )}
                        >
                            {option ? upToLabel : unlimitedLabel}
                        </button>
                    ))}
                </div>

                {/* Value */}
                {limited && (
                    <input
                        type="number"
                        min={min}
                        step={1}
                        value={value}
                        onChange={handleValueChange}
                        aria-label={label}
                        aria-invalid={Boolean(error)}
                        className={adminInputClass('w-20 font-mono')}
                    />
                )}
            </div>
        </AdminField>
    );
}
