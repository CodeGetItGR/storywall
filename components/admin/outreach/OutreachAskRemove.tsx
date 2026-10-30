'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useOutreachRemoveRequest } from '@/hooks/useOutreachRemoveRequest';

// Marketing can't remove a business; they ask an admin, saying why.
export function OutreachAskRemove({ prospectId }: { prospectId: string }) {
    const t = useTranslations('AdminPage.outreach.askRemove');
    const request = useOutreachRemoveRequest(prospectId);
    const toErrorMessage = useApiErrorMessage();

    return (
        <section className="space-y-2 border-t border-border pt-4">
            {request.sent ? (
                <p role="status" className="text-sm font-semibold text-status-good">
                    {t('sent')}
                </p>
            ) : (
                <button
                    type="button"
                    onClick={request.openDialog}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md px-1 text-sm font-semibold text-status-danger hover:underline"
                >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    {t('action')}
                </button>
            )}

            {Boolean(request.error) && (
                <p role="alert" className="text-sm text-status-danger">
                    {toErrorMessage(request.error)}
                </p>
            )}

            {/* Why */}
            <ConfirmActionModal
                open={request.dialogOpen}
                title={t('title')}
                body={
                    <div className="space-y-3">
                        <p>{t('body')}</p>
                        <AdminField label={t('reason')} required>
                            <textarea
                                value={request.reason}
                                onChange={request.handleReasonChange}
                                maxLength={2000}
                                rows={3}
                                className={adminInputClass('resize-y')}
                            />
                        </AdminField>
                    </div>
                }
                confirmLabel={t('confirm')}
                cancelLabel={t('cancel')}
                tone="danger"
                size="md"
                confirmDisabled={!request.reason.trim()}
                isConfirming={request.isSending}
                onCloseAction={request.closeDialog}
                onConfirmAction={request.confirmRequest}
                icon={request.isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </section>
    );
}
