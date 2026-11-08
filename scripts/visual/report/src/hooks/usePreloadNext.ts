import { useEffect } from 'react';

import type { ReportModel } from '../lib/model';
import { currentEntry } from '../lib/viewState';
import type { ReportView } from './useReportView';

// Loads the next item's images early, so moving through a review doesn't wait on them.
export function usePreloadNext(model: ReportModel, view: ReportView) {
    const next = view.queue[view.index + 1];
    const entry = next ? currentEntry(model, next, view) : null;
    const before = entry?.images.before;
    const after = entry?.images.after;
    // The diff image only shows in Diff mode.
    const diff = view.compare === 'diff' ? entry?.images.diff : undefined;

    useEffect(() => {
        for (const src of [before, after, diff]) {
            if (src) new Image().src = src;
        }
    }, [before, after, diff]);
}
