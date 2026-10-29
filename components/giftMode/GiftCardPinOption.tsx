'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

export function GiftCardPinOption({
    pin,
    includePin,
    onChangeAction,
}: {
    pin: string | null;
    includePin: boolean;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('GiftMode.card');

    if (!pin) return <p className="text-sm text-ink-muted">{t('pinUnavailable')}</p>;

    return (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
            <input type="checkbox" checked={includePin} onChange={onChangeAction} className="h-4 w-4 accent-primary" />
            {t('includePin')}
        </label>
    );
}
