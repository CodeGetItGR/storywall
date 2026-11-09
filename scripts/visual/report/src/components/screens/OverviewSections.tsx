import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import { percentText, shortName } from '../../lib/labels';
import type { Marks } from '../../lib/marks';
import { type Group, type ReportModel, STATES, type Story } from '../../lib/model';
import { type AreaRow, areaRows, biggestChanges, failedCount, failedStories } from '../../lib/overview';
import { Swatches } from '../Swatches';
import { CaptureThumb } from './CaptureThumb';

const GROUPS_SHOWN = 6;

type SectionProps = { model: ReportModel; view: ReportView };

function FailedRow({ story, view }: { story: Story; view: ReportView }) {
    function handleClick() {
        view.go({ kind: 'story', id: story.id });
    }
    return (
        <button type="button" className="row group-row" onClick={handleClick}>
            <span className="dot s-failed" />
            <span className="name">{shortName(story.entries[0])}</span>
            <span className="value">{copy.captures(failedCount(story))}</span>
        </button>
    );
}

export function FailedSection({ model, view }: SectionProps) {
    const stories = failedStories(model);
    if (stories.length === 0) return null;
    return (
        <section className="section">
            <h2>{copy.states.failed}</h2>
            <div className="plain-list">
                {stories.map((story) => (
                    <FailedRow key={story.id} story={story} view={view} />
                ))}
            </div>
        </section>
    );
}

function AreaTableRow({ row, view }: { row: AreaRow; view: ReportView }) {
    function handleClick() {
        view.goInAreaList({ kind: 'story', id: row.firstStory });
    }
    return (
        <tr onClick={handleClick}>
            <td>
                <button type="button" className="link-button">
                    {row.area}
                </button>
            </td>
            {STATES.map((state) => (
                <td key={state}>
                    <span className={row.counts[state] === 0 ? 'zero' : undefined}>{row.counts[state]}</span>
                </td>
            ))}
            <td>
                {row.reviewed}/{row.total}
            </td>
        </tr>
    );
}

export function AreaSection({ model, view, marks }: SectionProps & { marks: Marks }) {
    const rows = areaRows(model, marks);
    if (rows.length === 0) return null;
    return (
        <section className="section">
            <h2>{copy.byArea}</h2>
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">{copy.area}</th>
                            {STATES.map((state) => (
                                <th key={state} scope="col">
                                    {copy.states[state]}
                                </th>
                            ))}
                            <th scope="col">{copy.reviewed}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <AreaTableRow key={row.area} row={row} view={view} />
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function SameChangeRow({ group, view }: { group: Group; view: ReportView }) {
    function handleClick() {
        view.go({ kind: 'group', key: group.key });
    }
    return (
        <button type="button" className="row group-row" onClick={handleClick}>
            <Swatches from={group.from} to={group.to} />
            <span className="name">{group.label}</span>
            <span className="value">{copy.captures(group.entries.length)}</span>
        </button>
    );
}

export function SameChangeSection({ model, view }: SectionProps) {
    if (model.groups.length === 0) return null;
    return (
        <section className="section">
            <h2>{copy.sameChange}</h2>
            <div className="plain-list">
                {model.groups.slice(0, GROUPS_SHOWN).map((group) => (
                    <SameChangeRow key={group.key} group={group} view={view} />
                ))}
            </div>
        </section>
    );
}

export function BiggestSection({ model, view }: SectionProps) {
    const big = biggestChanges(model);
    if (big.length === 0) return null;
    return (
        <section className="section">
            <h2>{copy.biggestChanges}</h2>
            <div className="thumbs">
                {big.map(({ story, entry }) => (
                    <CaptureThumb
                        key={story.id}
                        entry={entry}
                        title={shortName(entry)}
                        value={percentText(entry.percent)}
                        onPick={view.openCapture}
                    />
                ))}
            </div>
        </section>
    );
}

export function MissingSection({ model }: { model: ReportModel }) {
    const { missingStories } = model.manifest;
    if (missingStories.length === 0) return null;
    return (
        <section className="section">
            <h2>{copy.missingStories}</h2>
            <ul className="plain-list">
                {missingStories.map((path) => (
                    <li key={path}>{path}</li>
                ))}
            </ul>
        </section>
    );
}
