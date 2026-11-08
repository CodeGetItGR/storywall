import type { ReportView } from '../../hooks/useReportView';
import type { Marks } from '../../lib/marks';
import { areaTree, type ReportModel } from '../../lib/model';
import { shownStories } from '../../lib/reviewOrder';
import { StoryRow, ToggleRow } from './TreeRows';

type AreaTreeProps = { model: ReportModel; view: ReportView; marks: Marks };

export function AreaTree({ model, view, marks }: AreaTreeProps) {
    const branches = areaTree(shownStories(model, view.filters, marks));
    return (
        <>
            {branches.map((branch) => (
                <div key={branch.area}>
                    {/* Area */}
                    <ToggleRow rowKey={branch.area} label={branch.area} count={branch.count} className="row-area" view={view} />
                    {view.isRowOpen(branch.area) &&
                        branch.components.map((component) => (
                            <div key={component.key}>
                                {/* Component */}
                                <ToggleRow
                                    rowKey={component.key}
                                    label={component.component}
                                    count={component.stories.length}
                                    className="row-component"
                                    view={view}
                                />
                                {/* Stories */}
                                {view.isRowOpen(component.key) &&
                                    component.stories.map((story) => (
                                        <StoryRow key={story.id} story={story} label={story.name} nested view={view} marks={marks} />
                                    ))}
                            </div>
                        ))}
                </div>
            ))}
        </>
    );
}
