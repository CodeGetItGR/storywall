import type { CaptureState, ReportEntry } from '../../../types';
import { capturesInOrder } from './captures';
import { isMarked, type Marks } from './marks';
import { type ReportModel, STATES, type Story } from './model';
import { reviewable } from './reviewOrder';

const BIGGEST_LIMIT = 8;

export type AreaRow = { area: string; firstStory: string; counts: Record<CaptureState, number>; reviewed: number; total: number };
export type BigChange = { story: Story; entry: ReportEntry };

function stateCounts(entries: ReportEntry[]): Record<CaptureState, number> {
    const counts = Object.fromEntries(STATES.map((state) => [state, 0])) as Record<CaptureState, number>;
    for (const entry of entries) counts[entry.state] += 1;
    return counts;
}

export function areaRows(model: ReportModel, marks: Marks): AreaRow[] {
    return [...new Set(model.stories.map((story) => story.area))].map((area) => {
        const stories = model.stories.filter((story) => story.area === area);
        const entries = stories.flatMap((story) => story.entries);
        const list = reviewable(entries);
        return {
            area,
            firstStory: stories[0].id,
            counts: stateCounts(entries),
            reviewed: list.filter((entry) => isMarked(marks, entry)).length,
            total: list.length,
        };
    });
}

export const failedStories = (model: ReportModel) => model.stories.filter((story) => story.entries.some((entry) => entry.state === 'failed'));

export function biggestChanges(model: ReportModel, limit = BIGGEST_LIMIT): BigChange[] {
    return model.stories
        .flatMap((story) => {
            const changed = capturesInOrder(story.entries).filter((entry) => entry.state === 'changed');
            if (changed.length === 0) return [];
            return [{ story, entry: changed.reduce((big, entry) => (entry.percent > big.percent ? entry : big)) }];
        })
        .sort((a, b) => b.entry.percent - a.entry.percent)
        .slice(0, limit);
}
