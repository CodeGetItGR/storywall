'use client';

import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// A plain yes/no on the event page, with the server's refusal under the question.
export function EventConfirmModal({
    open,
    title,
    body,
    confirmLabel,
    action,
    onCloseAction,
    tone = 'danger',
}: {
    open: boolean;
    title: string;
    body: string;
    confirmLabel: string;
    action: { confirm: () => Promise<void>; isPending: boolean; error: unknown };
    onCloseAction: () => void;
    tone?: 'danger' | 'default';
}) {
    const t = useTranslations('AdminPage');

    return (
        <ConfirmActionModal
            open={open}
            tone={tone}
            onCloseAction={onCloseAction}
            title={title}
            body={
                <div className="space-y-3">
                    <p>{body}</p>
                    {Boolean(action.error) && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(action.error)}`)}</p>}
                </div>
            }
            cancelLabel={t('cancel')}
            confirmLabel={confirmLabel}
            isConfirming={action.isPending}
            onConfirmAction={action.confirm}
        />
    );
}
