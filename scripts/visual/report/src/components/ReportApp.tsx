import { useDrawerFocus } from '../hooks/useDrawerFocus';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { usePreloadNext } from '../hooks/usePreloadNext';
import { type ReportView, useReportView } from '../hooks/useReportView';
import { useReviewMarks } from '../hooks/useReviewMarks';
import { useRoute } from '../hooks/useRoute';
import type { Marks } from '../lib/marks';
import type { ReportModel } from '../lib/model';
import { BottomBar } from './screens/BottomBar';
import { GroupScreen } from './screens/GroupScreen';
import { OverviewScreen } from './screens/OverviewScreen';
import { ShortcutsHelp } from './screens/ShortcutsHelp';
import { StoryScreen } from './screens/StoryScreen';
import { TopBar } from './screens/TopBar';
import { Sidebar } from './sidebar/Sidebar';

type CurrentScreenProps = { model: ReportModel; view: ReportView; marks: Marks };

// Each item gets its own key, so moving to the next one starts its images at the top.
function CurrentScreen({ model, view, marks }: CurrentScreenProps) {
    const { item, entry } = view;
    if (item.kind === 'story' && entry) {
        const story = model.storyById.get(item.id);
        if (story) return <StoryScreen key={story.id} story={story} entry={entry} view={view} />;
    }
    if (item.kind === 'group' && entry) {
        const group = model.groupByKey.get(item.key);
        if (group) return <GroupScreen key={group.key} group={group} entry={entry} view={view} />;
    }
    return <OverviewScreen model={model} view={view} marks={marks} />;
}

export function ReportApp({ model }: { model: ReportModel }) {
    const review = useReviewMarks(model);
    const route = useRoute(model);
    const view = useReportView(model, route, review);
    const drawer = useDrawerFocus(view.drawerOpen);
    useKeyboardShortcuts(view);
    usePreloadNext(model, view);

    return (
        <div className="app">
            {/* Story list */}
            <Sidebar model={model} view={view} marks={review.marks} drawerRef={drawer.drawerRef} />

            {/* Backdrop behind the phone drawer */}
            {view.drawerOpen && <div className="scrim scrim-drawer" onClick={view.closeDrawer} />}

            {/* One item at a time */}
            <main className="main" inert={view.helpOpen}>
                <TopBar open={view.drawerOpen} buttonRef={drawer.buttonRef} onOpenDrawer={view.openDrawer} />
                <CurrentScreen model={model} view={view} marks={review.marks} />
                <BottomBar model={model} view={view} marks={review.marks} />
            </main>

            {/* Keyboard shortcuts */}
            {view.helpOpen && <ShortcutsHelp onClose={view.closeHelp} />}
        </div>
    );
}
