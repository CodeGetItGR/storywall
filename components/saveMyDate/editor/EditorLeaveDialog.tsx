'use client';

import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';

type EditorLeaveDialogProps = {
    open: boolean;
    onLeave: () => void;
    onStay: () => void;
};

// Back was pressed while the changes couldn't be saved.
export function EditorLeaveDialog({ open, onLeave, onStay }: EditorLeaveDialogProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <ConfirmActionModal
            open={open}
            title={t('leaveTitle')}
            body={t('leaveBody')}
            confirmLabel={t('leave')}
            cancelLabel={t('stay')}
            onCloseAction={onStay}
            onConfirmAction={onLeave}
        />
    );
}
