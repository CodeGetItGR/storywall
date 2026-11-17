import { useRef } from 'react';

import type { ReportEntry } from '../../../types';
import type { Group } from '../lib/model';
import type { ReportView } from './useReportView';

const THUMB_PAGE = 60;

// A group's thumbnails, the first 60 until Show all. A picked one shows from the top of the stage.
export function useGroupThumbs(group: Group, view: ReportView) {
    const stageRef = useRef<HTMLDivElement>(null);
    const showingAll = view.allThumbs.has(group.key);

    function pick(entry: ReportEntry) {
        view.pickGroupCapture(group.key, entry.id);
        if (stageRef.current) stageRef.current.scrollTop = 0;
    }

    function showAll() {
        view.showAllThumbs(group.key);
    }

    return {
        stageRef,
        shown: showingAll ? group.entries : group.entries.slice(0, THUMB_PAGE),
        hasMore: !showingAll && group.entries.length > THUMB_PAGE,
        storyCount: new Set(group.entries.map((entry) => entry.storyId)).size,
        pick,
        showAll,
    };
}
