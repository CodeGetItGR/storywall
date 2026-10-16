'use client';

import { useTranslations } from 'next-intl';

import { ReviewForm } from '@/components/review/ReviewForm';
import { ReviewSent } from '@/components/review/ReviewSent';
import { Modal } from '@/components/ui/modal';
import type { ReviewFormValues } from '@/hooks/useReviewForm';

export function ReviewPromptSheet({
    open,
    eventTitle,
    sent,
    isSending,
    error,
    onCloseAction,
    onSendAction,
}: {
    open: boolean;
    eventTitle: string;
    sent: boolean;
    isSending: boolean;
    error: string | null;
    onCloseAction: () => void;
    onSendAction: (values: ReviewFormValues) => void;
}) {
    const t = useTranslations('ReviewPrompt');

    return (
        <Modal ariaLabel={t('title', { eventTitle })} closeLabel={t('close')} onClose={onCloseAction} open={open} size="sm" variant="sheet">
            <Modal.Body className="p-5 sm:p-6">
                {/* Content */}
                {sent ? (
                    <ReviewSent onCloseAction={onCloseAction} />
                ) : (
                    <ReviewForm eventTitle={eventTitle} isSending={isSending} error={error} onSubmitAction={onSendAction} onNotNowAction={onCloseAction} />
                )}
            </Modal.Body>
        </Modal>
    );
}
