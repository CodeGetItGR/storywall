'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';

export function PlanModuleConfigJsonField({
    value,
    error,
    onChangeAction,
}: {
    value: string;
    error: string | null;
    onChangeAction: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
    const t = useTranslations('AdminPage.plans.grid.cell');

    return (
        <AdminField label={t('otherKeys')} optional hint={error ?? undefined}>
            <textarea
                value={value}
                onChange={onChangeAction}
                rows={4}
                spellCheck={false}
                aria-invalid={Boolean(error)}
                placeholder="{}"
                className={adminInputClass('min-h-24 resize-y font-mono text-xs')}
            />
        </AdminField>
    );
}
