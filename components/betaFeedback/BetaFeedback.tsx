'use client';

import { lazy, Suspense } from 'react';

import { ReportProblemButton } from '@/components/betaFeedback/ReportProblemButton';
import { useBetaFeedback } from '@/hooks/useBetaFeedback';
import { useDeferredMount } from '@/hooks/useDeferredMount';

const BugReportModal = lazy(() => import('@/components/betaFeedback/BugReportModal').then((module) => ({ default: module.BugReportModal })));

export function BetaFeedback() {
    const { config, eventId, open, openReport, closeReport } = useBetaFeedback();
    // The report form's code loads the first time someone opens it.
    const shouldMountReport = useDeferredMount({ likely: false, needed: open });

    if (!config) return null;

    return (
        <>
            {/* Trigger */}
            <ReportProblemButton onClickAction={openReport} />

            {/* Report */}
            {shouldMountReport && (
                <Suspense fallback={null}>
                    <BugReportModal open={open} onCloseAction={closeReport} config={config} eventId={eventId} />
                </Suspense>
            )}
        </>
    );
}
