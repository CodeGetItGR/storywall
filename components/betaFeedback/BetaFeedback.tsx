'use client';

import { BugReportModal } from '@/components/betaFeedback/BugReportModal';
import { ReportProblemButton } from '@/components/betaFeedback/ReportProblemButton';
import { useBetaFeedback } from '@/hooks/useBetaFeedback';

export function BetaFeedback() {
    const { config, eventId, open, openReport, closeReport } = useBetaFeedback();

    if (!config) return null;

    return (
        <>
            {/* Trigger */}
            <ReportProblemButton onClickAction={openReport} />

            {/* Report */}
            <BugReportModal open={open} onCloseAction={closeReport} config={config} eventId={eventId} />
        </>
    );
}
