'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import type { QrCardSize } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// A6 or A5, shown only when the picked design offers both.
export function QrCardSizeControl({
    sizes,
    size,
    onChangeAction,
}: {
    sizes: QrCardSize[];
    size: QrCardSize;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('QrCardPage.size');
    if (sizes.length < 2) return null;

    return (
        <fieldset>
            {/* Label */}
            <legend className="mb-2 text-sm font-semibold text-ink">{t('label')}</legend>
            {/* Options */}
            <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-muted p-1">
                {sizes.map((option) => (
                    <label
                        key={option}
                        className={cn(
                            'flex min-h-10 cursor-pointer items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors has-focus-visible:ring-2 has-focus-visible:ring-primary/30',
                            option === size ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                        )}
                    >
                        <input
                            type="radio"
                            name="qr-card-size"
                            value={option}
                            checked={option === size}
                            onChange={onChangeAction}
                            className="sr-only"
                        />
                        {t(option)}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
