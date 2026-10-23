'use client';

import { ReviewPromptSheet } from '@/components/review/ReviewPromptSheet';
import { useReviewPromptSheet } from '@/hooks/useReviewPromptSheet';

export function ReviewPrompt() {
    const sheet = useReviewPromptSheet();

    if (!sheet.prompt) return null;

    return (
        <ReviewPromptSheet
            open={sheet.open}
            eventTitle={sheet.prompt.eventTitle}
            sent={sheet.sent}
            isSending={sheet.isSending}
            error={sheet.error}
            onCloseAction={sheet.close}
            onSendAction={sheet.send}
        />
    );
}
