'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';

type EditorConflictDialogProps = {
    open: boolean;
    isReloading?: boolean;
    onReload: () => void;
};

// Someone saved this draft elsewhere. Saving stops here, and the only way on is the newer copy.
export function EditorConflictDialog({ open, isReloading = false, onReload }: EditorConflictDialogProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <ConfirmActionModal
            open={open}
            title={t('conflictTitle')}
            body={t('conflictBody')}
            confirmLabel={t('conflictReload')}
            cancelLabel={t('conflictReload')}
            onCloseAction={noop}
            onConfirmAction={onReload}
            isConfirming={isReloading}
            tone="default"
            icon={<RefreshCw className="h-5 w-5" aria-hidden="true" />}
            iconTone="neutral"
            showCancelAction={false}
            showCloseButton={false}
        />
    );
}

// Esc, the backdrop and Back leave it open: the editor can't go on without reloading.
function noop() {}
