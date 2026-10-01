import { useCallback, useState } from 'react';

import { useCreateReport } from '@/hooks/useReports';
import { ERROR_CODES, getErrorCode, isRateLimitedError } from '@/lib/api/errors';
import type { ReportReason, ReportTargetType } from '@/lib/api/types';

type ReportErrorMessages = {
    failed: string;
    ownContent: string;
    gone: string;
    rateLimited: string;
};

type UseReportSubmissionOptions = {
    eventId: string;
    targetId: string;
    targetType: ReportTargetType;
    onSuccessAction: () => void;
    messages: ReportErrorMessages;
};

export function useReportSubmission({ eventId, targetId, targetType, onSuccessAction, messages }: UseReportSubmissionOptions) {
    const createReport = useCreateReport();
    const [reason, setReason] = useState<ReportReason | ''>('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState<string | null>(null);

    const reset = useCallback(() => {
        setReason('');
        setDescription('');
        setError(null);
    }, []);

    async function submit() {
        if (!reason || createReport.isPending) return;

        setError(null);
        try {
            await createReport.mutateAsync({
                eventId,
                targetId,
                targetType,
                reason,
                ...(description.trim() ? { description: description.trim() } : {}),
            });
            onSuccessAction();
        } catch (err) {
            setError(messageFor(err, messages));
        }
    }

    return {
        description,
        error,
        isSubmitting: createReport.isPending,
        reason,
        reset,
        setDescription,
        setReason,
        submit,
    };
}

function messageFor(error: unknown, messages: ReportErrorMessages): string {
    if (isRateLimitedError(error)) return messages.rateLimited;
    switch (getErrorCode(error)) {
        case ERROR_CODES.REPORT_OWN_CONTENT:
            return messages.ownContent;
        case ERROR_CODES.RESOURCE_NOT_FOUND:
            return messages.gone;
        default:
            return messages.failed;
    }
}
