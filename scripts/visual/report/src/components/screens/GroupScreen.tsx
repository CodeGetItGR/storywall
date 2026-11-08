import { useRef } from 'react';

import type { ReportEntry } from '../../../../types';
import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import { captureLabel, shortName } from '../../lib/labels';
import type { Group } from '../../lib/model';
import { appliedZoom } from '../../lib/viewState';
import { CompareView } from '../compare/CompareView';
import { ViewControls } from '../compare/ViewControls';
import { Swatches } from '../Swatches';
import { CaptureThumb } from './CaptureThumb';

const THUMB_PAGE = 60;

type GroupScreenProps = { group: Group; entry: ReportEntry; view: ReportView };

export function GroupScreen({ group, entry, view }: GroupScreenProps) {
    const stageRef = useRef<HTMLDivElement>(null);
    const showAll = view.allThumbs.has(group.key);
    const shown = showAll ? group.entries : group.entries.slice(0, THUMB_PAGE);
    const storyCount = new Set(group.entries.map((item) => item.storyId)).size;

    function handlePick(item: ReportEntry) {
        view.pickGroupCapture(group.key, item.id);
        if (stageRef.current) stageRef.current.scrollTop = 0;
    }
    function handleShowAll() {
        view.showAllThumbs(group.key);
    }

    return (
        <>
            {/* Header */}
            <header className="head">
                <div className="title-line">
                    <div>
                        <div className="crumb">{copy.sameChange}</div>
                        <h1>{group.label}</h1>
                    </div>
                    <Swatches from={group.from} to={group.to} />
                    <span className="position">{copy.groupSize(group.entries.length, storyCount)}</span>
                </div>
                <div className="controls">
                    <span className="crumb">{copy.showing(shortName(entry), captureLabel(entry))}</span>
                    <span className="spacer" />
                    <ViewControls entry={entry} compare={view.compare} zoom={view.zoom} onCompare={view.setCompare} onZoom={view.setZoom} />
                </div>
            </header>

            <div className={`stage zoom-${appliedZoom(entry, view.compare, view.zoom)}`} ref={stageRef}>
                {/* The capture being looked at */}
                <div className="section">
                    <CompareView entry={entry} compare={view.compare} slider={view.slider} onSlider={view.setSlider} />
                </div>

                {/* Every capture in the group */}
                <div className="section">
                    <h2>{copy.everyCapture}</h2>
                    <div className="thumbs">
                        {shown.map((item) => (
                            <CaptureThumb
                                key={item.id}
                                entry={item}
                                title={shortName(item)}
                                value={captureLabel(item)}
                                current={item === entry}
                                onPick={handlePick}
                            />
                        ))}
                    </div>
                    {!showAll && group.entries.length > THUMB_PAGE && (
                        <div>
                            <button type="button" className="btn" onClick={handleShowAll}>
                                {copy.showAll(group.entries.length)}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
