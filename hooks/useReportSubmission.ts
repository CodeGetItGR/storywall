import { useState } from 'react';

import { useCreateReport } from '@/hooks/useReports';
import type { ReportReason, ReportTargetType } from '@/lib/api/types';

type UseReportSubmissionOptions = {
    eventId: string;
    targetId: string;
    targetType: ReportTargetType;
    onSuccessAction: () => void;
    failedMessage: string;
};

export function useReportSubmission({ eventId, targetId, targetType, onSuccessAction, failedMessage }: UseReportSubmissionOptions) {
    const createReport = useCreateReport();
    const [reason, setReason] = useState<ReportReason | ''>('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState<string | null>(null);

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
        } catch {
            setError(failedMessage);
        }
    }

    return {
        description,
        error,
        isSubmitting: createReport.isPending,
        reason,
        setDescription,
        setReason,
        submit,
    };
}
