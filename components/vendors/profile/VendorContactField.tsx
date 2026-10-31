'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { VendorProfileInput } from '@/components/vendors/profile/VendorProfileInput';
import { cn } from '@/lib/utils';

// A partner's phone or email, with the switch that shows it on their card.
export function VendorContactField({
    label,
    value,
    error,
    maxLength,
    type,
    autoComplete,
    shown,
    disabled,
    onChangeAction,
    onShownChangeAction,
}: {
    label: string;
    value: string;
    error?: string;
    maxLength: number;
    type: 'tel' | 'email';
    autoComplete: string;
    shown: boolean;
    disabled: boolean;
    onChangeAction: (value: string) => void;
    onShownChangeAction: (shown: boolean) => void;
}) {
    const t = useTranslations('Vendors.profile');
    const handleToggle = useCallback(() => onShownChangeAction(!shown), [onShownChangeAction, shown]);

    return (
        <div className="flex flex-col gap-2">
            {/* Value */}
            <VendorProfileInput
                label={label}
                value={value}
                error={error}
                maxLength={maxLength}
                type={type}
                inputMode={type}
                autoComplete={autoComplete}
                onChangeAction={onChangeAction}
            />

            {/* Show on card */}
            <button
                type="button"
                role="switch"
                aria-checked={shown}
                aria-label={`${label}: ${t('showOnCard')}`}
                disabled={disabled}
                onClick={handleToggle}
                className="flex min-h-10 items-center justify-between gap-3 text-left focus-ring disabled:opacity-50"
            >
                <span className="text-sm text-ink">{t('showOnCard')}</span>
                <span className={cn('h-6 w-10 shrink-0 rounded-full p-0.5 transition-colors', shown ? 'bg-ink' : 'bg-surface-muted')}>
                    <span className={cn('block size-5 rounded-full bg-white shadow-sm transition-transform', shown && 'translate-x-4')} />
                </span>
            </button>
        </div>
    );
}
