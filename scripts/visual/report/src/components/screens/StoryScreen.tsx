import type { ReportEntry } from '../../../../types';
import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import { type Story, worstState } from '../../lib/model';
import { appliedZoom } from '../../lib/viewState';
import { CaptureTabs } from '../compare/CaptureTabs';
import { CompareView } from '../compare/CompareView';
import { ViewControls } from '../compare/ViewControls';

type StoryScreenProps = { story: Story; entry: ReportEntry; view: ReportView };

export function StoryScreen({ story, entry, view }: StoryScreenProps) {
    const state = worstState(story.entries);
    return (
        <>
            {/* Header */}
            <header className="head">
                <div className="title-line">
                    <div>
                        <div className="crumb">
                            {story.area} / {story.component}
                        </div>
                        <h1>{story.name}</h1>
                    </div>
                    <span className={`pill s-${state}`}>
                        <span className="dot" />
                        {copy.states[state]}
                    </span>
                </div>
                <div className="controls">
                    <CaptureTabs story={story} current={entry} onPick={view.pickCapture} />
                    <span className="spacer" />
                    <ViewControls entry={entry} compare={view.compare} zoom={view.zoom} onCompare={view.setCompare} onZoom={view.setZoom} />
                </div>
            </header>

            {/* Images */}
            <div className={`stage zoom-${appliedZoom(entry, view.compare, view.zoom)}`}>
                <CompareView entry={entry} compare={view.compare} slider={view.slider} onSlider={view.setSlider} />
            </div>
        </>
    );
}
