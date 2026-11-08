import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import { useScrollToCurrentRow } from '../../hooks/useScrollToCurrentRow';
import type { Marks } from '../../lib/marks';
import type { ReportModel } from '../../lib/model';
import { AreaTree } from './AreaTree';
import { SameChangeList } from './SameChangeList';
import { SidebarFilters } from './SidebarFilters';
import { SidebarHeader } from './SidebarHeader';
import { OverviewRow } from './TreeRows';

type SidebarProps = { model: ReportModel; view: ReportView; marks: Marks };

export function Sidebar({ model, view, marks }: SidebarProps) {
    const treeRef = useScrollToCurrentRow(view.item, view.mode);
    return (
        <aside className={view.drawerOpen ? 'side open' : 'side'}>
            {/* Identity, progress and filters */}
            <div className="side-head">
                <SidebarHeader model={model} marks={marks} />
                <SidebarFilters model={model} view={view} />
            </div>

            {/* Story list */}
            <nav className="tree" aria-label={copy.stories} ref={treeRef}>
                <OverviewRow view={view} />
                {view.mode === 'area' ? (
                    <AreaTree model={model} view={view} marks={marks} />
                ) : (
                    <SameChangeList model={model} view={view} marks={marks} />
                )}
                {/* The region stays in place so the message is announced when it appears. A report with no differences has nothing to filter, so it stays quiet. */}
                <div role="status">
                    {view.queue.length === 0 && model.manifest.entries.length > 0 && <div className="tree-empty">{copy.nothingMatches}</div>}
                </div>
            </nav>
        </aside>
    );
}
