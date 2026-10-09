'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { GRANT_REASON_MAX_LENGTH } from '@/lib/adminEvents';

// Every grant is audited with a reason the host never sees.
export function EventGrantReasonField({
    value,
    invalid,
    onChangeAction,
}: {
    value: string;
    invalid: boolean;
    onChangeAction: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
    const t = useTranslations('AdminPage.events.reason');

    return (
        <AdminField label={t('label')} required hint={invalid ? t('invalid') : t('hint')}>
            <textarea
                value={value}
                onChange={onChangeAction}
                maxLength={GRANT_REASON_MAX_LENGTH}
                rows={3}
                aria-invalid={invalid}
                className={adminInputClass(invalid ? 'resize-y border-status-danger' : 'resize-y')}
            />
        </AdminField>
    );
}
