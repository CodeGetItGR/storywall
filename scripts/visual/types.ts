import type { CaptureLocale, WidthName } from './config';

export type CaptureTarget = { id: string; storyId: string; title: string; name: string; locale: CaptureLocale; width: WidthName };

export type CaptureRecord = CaptureTarget & { status: 'ok' | 'failed'; hash: string | null; error: string | null };

export type CaptureState = 'changed' | 'new' | 'removed' | 'failed';

export type ReportEntry = CaptureTarget & {
    state: CaptureState;
    beforeHash: string | null;
    afterHash: string | null;
    percent: number;
    error: string | null;
    images: { before?: string; after?: string; diff?: string; preview?: string };
};

export type Manifest = {
    headSha: string;
    baseSha: string;
    totalCaptures: number;
    counts: Record<CaptureState, number>;
    fingerprint: string;
    entries: ReportEntry[];
    missingStories: string[];
};

export type ChangeGroup = { key: string; kind: 'color' | 'exact'; from?: string; to?: string };
