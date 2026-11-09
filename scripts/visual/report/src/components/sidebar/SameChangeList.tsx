import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import { shortName } from '../../lib/labels';
import type { Marks } from '../../lib/marks';
import type { ReportModel } from '../../lib/model';
import { shownGroups, storiesOnTheirOwn } from '../../lib/reviewOrder';
import { GroupRow, StoryRow } from './TreeRows';

type SameChangeListProps = { model: ReportModel; view: ReportView; marks: Marks };

export function SameChangeList({ model, view, marks }: SameChangeListProps) {
    const groups = shownGroups(model, view.filters, marks);
    const alone = storiesOnTheirOwn(model, view.filters, marks);
    return (
        <>
            {/* Groups */}
            {groups.length > 0 && (
                <div className="tree-title" role="heading" aria-level={2}>
                    {copy.sameChange}
                </div>
            )}
            {groups.map((group) => (
                <GroupRow key={group.key} group={group} view={view} marks={marks} />
            ))}

            {/* Stories with no group */}
            {alone.length > 0 && (
                <div className="tree-title" role="heading" aria-level={2}>
                    {copy.onTheirOwn}
                </div>
            )}
            {alone.map((story) => (
                <StoryRow key={story.id} story={story} label={shortName(story.entries[0])} nested={false} view={view} marks={marks} />
            ))}
        </>
    );
}
