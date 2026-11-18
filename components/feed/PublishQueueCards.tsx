'use client';

import { PublishQueueCard } from '@/components/feed/PublishQueueCard';
import { ShareAfterUploadSheet } from '@/components/feed/ShareAfterUploadSheet';
import { useShareAfterUpload } from '@/hooks/useShareAfterUpload';
import { usePublishQueue } from '@/providers/publishQueue/PublishQueueContext';

export function PublishQueueCards() {
    const { jobs, retryJob, dismissJob } = usePublishQueue();
    const {
        sheetOpen,
        shareableJobIds,
        shareJob,
        shareFromSheet,
        declineSheet,
        dismissJob: dismissShareableJob,
    } = useShareAfterUpload(jobs, dismissJob);

    return (
        <>
            {/* Upload progress */}
            {jobs.length > 0 && (
                <div className="flex flex-col">
                    {jobs.map((job) => (
                        <PublishQueueCard
                            key={job.id}
                            job={job}
                            onRetry={retryJob}
                            onDismiss={dismissShareableJob}
                            onShare={shareableJobIds.has(job.id) ? shareJob : undefined}
                        />
                    ))}
                </div>
            )}

            {/* Share after upload */}
            <ShareAfterUploadSheet open={sheetOpen} onShareAction={shareFromSheet} onDeclineAction={declineSheet} />
        </>
    );
}
