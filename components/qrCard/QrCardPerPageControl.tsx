'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { QrCardChoiceControl } from '@/components/qrCard/QrCardChoiceControl';
import type { QrCardPerPage } from '@/lib/qrCard';

// One card per page, or as many as fit on an A4 sheet. Applies to Print and Save PDF.
export function QrCardPerPageControl({
    perPage,
    sheetCount,
    onChangeAction,
}: {
    perPage: QrCardPerPage;
    sheetCount: number;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('QrCardPage.perPage');

    return (
        <QrCardChoiceControl<QrCardPerPage>
            name="qr-card-per-page"
            legend={t('label')}
            options={[
                { value: 'one', label: t('one') },
                { value: 'sheet', label: t('sheet', { count: sheetCount }) },
            ]}
            value={perPage}
            onChangeAction={onChangeAction}
        />
    );
}
