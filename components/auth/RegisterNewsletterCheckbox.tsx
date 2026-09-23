'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

// Verifying the account email also confirms the subscription, so there is no
// separate newsletter confirmation to mention here.
export function RegisterNewsletterCheckbox({
    checked,
    discountPercent,
    onChangeAction,
}: {
    checked: boolean;
    discountPercent: number;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('RegisterPage.newsletter');

    return (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-1">
            <input type="checkbox" checked={checked} onChange={onChangeAction} className="mt-0.5 size-4 shrink-0 accent-primary" />
            <span className="flex flex-col gap-0.5">
                <span className="text-sm text-ink">{t('label', { percent: discountPercent })}</span>
                <span className="text-xs text-ink-muted">{t('hint')}</span>
            </span>
        </label>
    );
}
