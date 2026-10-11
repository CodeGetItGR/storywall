'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EventDeleteConfirmModal } from '@/components/manage/danger/EventDeleteConfirmModal';
import { useEventDeletionFlow } from '@/hooks/useEventDeletionFlow';

// A draft has no danger zone tab, so its delete action lives at the foot of its overview.
export function DraftDeleteSection({ eventId }: { eventId: string }) {
    const t = useTranslations('ManagePage');
    const deletionFlow = useEventDeletionFlow(eventId);

    return (
        <div className="border-t border-border/70 pt-3">
            {/* Delete */}
            <button
                type="button"
                onClick={deletionFlow.openConfirm}
                disabled={deletionFlow.isDeleting}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-rose-600 transition-colors hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t('draft.delete.action')}
            </button>

            {/* Confirm */}
            <EventDeleteConfirmModal
                draft
                open={deletionFlow.confirmOpen}
                step={deletionFlow.step}
                otpCode={deletionFlow.otpCode}
                codeDigits={deletionFlow.codeDigits}
                onOtpChangeAction={deletionFlow.handleOtpChange}
                otpInvalid={deletionFlow.otpInvalid}
                deleteError={deletionFlow.deleteError}
                resendSeconds={deletionFlow.resendSeconds}
                isSendingCode={deletionFlow.isSendingCode}
                isDeleting={deletionFlow.isDeleting}
                onCloseAction={deletionFlow.closeConfirm}
                onSendCodeAction={deletionFlow.sendOtp}
                onConfirmAction={deletionFlow.confirmDelete}
            />
        </div>
    );
}
