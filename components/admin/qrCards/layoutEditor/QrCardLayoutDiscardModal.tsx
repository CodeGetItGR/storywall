'use client';

import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';

// Closing the editor with unsaved changes asks first.
export function QrCardLayoutDiscardModal({
    open,
    onDiscardAction,
    onKeepAction,
}: {
    open: boolean;
    onDiscardAction: () => void;
    onKeepAction: () => void;
}) {
    const t = useTranslations('AdminPage.qrCards.layout.discard');

    return (
        <ConfirmActionModal
            open={open}
            title={t('title')}
            body={t('body')}
            confirmLabel={t('confirm')}
            cancelLabel={t('keep')}
            onCloseAction={onKeepAction}
            onConfirmAction={onDiscardAction}
        />
    );
}
