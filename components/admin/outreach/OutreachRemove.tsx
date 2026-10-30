'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useOutreachRemoval } from '@/hooks/useOutreachRemoval';

// Removing a business can't be undone, so it asks in a confirmation dialog first.
export function OutreachRemove({ prospectId, onRemovedAction }: { prospectId: string; onRemovedAction: () => void }) {
    const t = useTranslations('AdminPage.outreach.remove');
    const removal = useOutreachRemoval(prospectId, onRemovedAction);
    const toErrorMessage = useApiErrorMessage();

    return (
        <section className="space-y-2 border-t border-border pt-4">
            <button
                type="button"
                onClick={removal.openConfirmation}
                className="inline-flex min-h-9 items-center gap-2 rounded-md px-1 text-sm font-semibold text-status-danger hover:underline"
            >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                {t('action')}
            </button>

            {Boolean(removal.error) && (
                <p role="alert" className="text-sm text-status-danger">
                    {toErrorMessage(removal.error)}
                </p>
            )}

            {/* Confirmation */}
            <ConfirmActionModal
                open={removal.confirmOpen}
                title={t('confirmTitle')}
                body={t('confirmBody')}
                confirmLabel={t('confirm')}
                cancelLabel={t('keep')}
                tone="danger"
                isConfirming={removal.isRemoving}
                onCloseAction={removal.closeConfirmation}
                onConfirmAction={removal.confirmRemoval}
                icon={removal.isRemoving ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </section>
    );
}
