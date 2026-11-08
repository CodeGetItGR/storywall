import { useId } from 'react';

import type { ReportView } from '../../hooks/useReportView';
import type { Marks } from '../../lib/marks';
import { type AreaBranch, areaTree, type ComponentBranch, type ReportModel } from '../../lib/model';
import { shownStories } from '../../lib/reviewOrder';
import { StoryRow, ToggleRow } from './TreeRows';

type BranchProps<T> = { branch: T; view: ReportView; marks: Marks };

// An open row's children form a group named after the row, so screen readers say which component a story is in.
function ComponentRows({ branch, view, marks }: BranchProps<ComponentBranch>) {
    const nameId = useId();
    return (
        <>
            {/* Component */}
            <ToggleRow
                rowKey={branch.key}
                nameId={nameId}
                label={branch.component}
                count={branch.stories.length}
                className="row-component"
                view={view}
            />
            {/* Stories */}
            {view.isRowOpen(branch.key) && (
                <div role="group" aria-labelledby={nameId}>
                    {branch.stories.map((story) => (
                        <StoryRow key={story.id} story={story} label={story.name} nested view={view} marks={marks} />
                    ))}
                </div>
            )}
        </>
    );
}

function AreaRows({ branch, view, marks }: BranchProps<AreaBranch>) {
    const nameId = useId();
    return (
        <>
            {/* Area */}
            <ToggleRow rowKey={branch.area} nameId={nameId} label={branch.area} count={branch.count} className="row-area" view={view} />
            {/* Components */}
            {view.isRowOpen(branch.area) && (
                <div role="group" aria-labelledby={nameId}>
                    {branch.components.map((component) => (
                        <ComponentRows key={component.key} branch={component} view={view} marks={marks} />
                    ))}
                </div>
            )}
        </>
    );
}

type AreaTreeProps = { model: ReportModel; view: ReportView; marks: Marks };

export function AreaTree({ model, view, marks }: AreaTreeProps) {
    const branches = areaTree(shownStories(model, view.filters, marks));
    return (
        <>
            {branches.map((branch) => (
                <AreaRows key={branch.area} branch={branch} view={view} marks={marks} />
            ))}
        </>
    );
}
