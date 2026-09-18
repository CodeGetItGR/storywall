'use client';

import { PublishQueueCard } from '@/components/feed/PublishQueueCard';
import { usePublishQueue } from '@/providers/publishQueue/PublishQueueContext';

export function PublishQueueCards() {
    const { jobs, retryJob, dismissJob } = usePublishQueue();

    if (jobs.length === 0) return null;

    return (
        <div className="flex flex-col">
            {jobs.map((job) => (
                <PublishQueueCard key={job.id} job={job} onRetry={retryJob} onDismiss={dismissJob} />
            ))}
        </div>
    );
}
