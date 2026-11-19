'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { canShareFiles, filesForFinishedJob, recordSharePromptDecline, shareFiles, shouldOpenSharePrompt } from '@/lib/shareFiles';
import type { PublishJob } from '@/providers/publishQueue/PublishQueueContext';

interface ShareSheetState {
    jobId: string;
    eventId: string;
    files: File[];
}

export interface ShareAfterUpload {
    sheetOpen: boolean;
    // Jobs whose "Posted" card gets a Share button (and stays until closed).
    shareableJobIds: ReadonlySet<string>;
    shareJob: (jobId: string) => void;
    shareFromSheet: () => void;
    declineSheet: () => void;
    dismissJob: (jobId: string) => void;
}

// Once a post or story finishes, gets its files ready for the phone's share menu, and opens the
// share sheet unless the guest has said "Not now" twice in this event. Files are ready before any
// tap, so the tap opens the share menu at once (Safari refuses a share that waits after the tap).
export function useShareAfterUpload(jobs: PublishJob[], dismissQueueJob: (jobId: string) => void): ShareAfterUpload {
    const [filesByJob, setFilesByJob] = useState<ReadonlyMap<string, File[]>>(new Map());
    const [sheet, setSheet] = useState<ShareSheetState | null>(null);
    const handledRef = useRef(new Set<string>());
    const sheetRef = useRef<ShareSheetState | null>(null);

    useEffect(() => {
        sheetRef.current = sheet;
    }, [sheet]);

    useEffect(() => {
        for (const job of jobs) {
            if (job.status !== 'success' || job.kind === 'song' || handledRef.current.has(job.id)) continue;
            handledRef.current.add(job.id);
            const { eventId } = job.payload;
            void filesForFinishedJob(job)
                .then((files) => {
                    if (!canShareFiles(files)) return;
                    setFilesByJob((current) => new Map(current).set(job.id, files));
                    if (!sheetRef.current && shouldOpenSharePrompt(eventId)) {
                        const next = { jobId: job.id, eventId, files };
                        sheetRef.current = next;
                        setSheet(next);
                    }
                })
                .catch(() => {
                    // A filter that can't be baked again: no share offer for this job.
                });
        }
    }, [jobs]);

    const dismissJob = useCallback(
        (jobId: string) => {
            setFilesByJob((current) => {
                if (!current.has(jobId)) return current;
                const next = new Map(current);
                next.delete(jobId);
                return next;
            });
            dismissQueueJob(jobId);
        },
        [dismissQueueJob],
    );

    const closeSheet = useCallback(() => {
        sheetRef.current = null;
        setSheet(null);
    }, []);

    const share = useCallback(
        (jobId: string, files: File[]) => {
            void shareFiles(files).then((result) => {
                if (result !== 'shared') return;
                if (sheetRef.current?.jobId === jobId) closeSheet();
                dismissJob(jobId);
            });
        },
        [closeSheet, dismissJob],
    );

    const shareJob = useCallback(
        (jobId: string) => {
            const files = filesByJob.get(jobId);
            if (files) share(jobId, files);
        },
        [filesByJob, share],
    );

    const shareFromSheet = useCallback(() => {
        if (sheet) share(sheet.jobId, sheet.files);
    }, [sheet, share]);

    const declineSheet = useCallback(() => {
        if (!sheet) return;
        recordSharePromptDecline(sheet.eventId);
        closeSheet();
        dismissJob(sheet.jobId);
    }, [sheet, closeSheet, dismissJob]);

    return {
        sheetOpen: sheet !== null,
        shareableJobIds: new Set(filesByJob.keys()),
        shareJob,
        shareFromSheet,
        declineSheet,
        dismissJob,
    };
}
