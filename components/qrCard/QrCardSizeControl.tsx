'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { QrCardChoiceControl } from '@/components/qrCard/QrCardChoiceControl';
import type { QrCardSize } from '@/lib/api/types';

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
        <QrCardChoiceControl
            name="qr-card-size"
            legend={t('label')}
            options={sizes.map((option) => ({ value: option, label: t(option) }))}
            value={size}
            onChangeAction={onChangeAction}
        />
    );
}
