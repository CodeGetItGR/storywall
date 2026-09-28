'use client';

import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export function CollaboratorStatusConfirm({
    open,
    collaborator,
    nextStatus,
    isConfirming,
    error,
    onCloseAction,
    onConfirmAction,
}: {
    open: boolean;
    collaborator: CollaboratorResponseDto;
    nextStatus: CollaboratorResponseDto['status'];
    isConfirming: boolean;
    error: unknown;
    onCloseAction: () => void;
    onConfirmAction: () => Promise<void>;
}) {
    const t = useTranslations('AdminPage.collaborations');
    const tAdmin = useTranslations('AdminPage');
    const copy = nextStatus === 'SUSPENDED' ? 'suspend' : 'reactivate';

    return (
        <ConfirmActionModal
            open={open}
            onCloseAction={onCloseAction}
            title={t(`${copy}.title`, { name: collaborator.name })}
            body={
                <div className="space-y-2">
                    <p>{t(`${copy}.body`)}</p>
                    {Boolean(error) && <p className="text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(error)}`)}</p>}
                </div>
            }
            cancelLabel={tAdmin('cancel')}
            confirmLabel={t(`${copy}.action`)}
            isConfirming={isConfirming}
            onConfirmAction={onConfirmAction}
            tone={nextStatus === 'SUSPENDED' ? 'danger' : 'default'}
        />
    );
}
