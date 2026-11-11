'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';

type EditorConflictDialogProps = {
    open: boolean;
    isReloading?: boolean;
    onReload: () => void;
    // What was saved elsewhere: a host's invitation or an admin's theme.
    subject?: 'invitation' | 'theme';
};

// Someone saved this draft or theme elsewhere. Saving stops here, and the only way on is the newer copy.
export function EditorConflictDialog({ open, isReloading = false, onReload, subject = 'invitation' }: EditorConflictDialogProps) {
    const t = useTranslations('InvitationEditor');
    const isTheme = subject === 'theme';

    return (
        <ConfirmActionModal
            open={open}
            title={isTheme ? t('themeConflictTitle') : t('conflictTitle')}
            body={isTheme ? t('themeConflictBody') : t('conflictBody')}
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
