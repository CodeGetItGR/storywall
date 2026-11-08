import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import type { Marks } from '../../lib/marks';
import type { ReportModel } from '../../lib/model';
import { AreaSection, BiggestSection, FailedSection, MissingSection, SameChangeSection } from './OverviewSections';

type OverviewScreenProps = { model: ReportModel; view: ReportView; marks: Marks };

export function OverviewScreen({ model, view, marks }: OverviewScreenProps) {
    const { entries, totalCaptures } = model.manifest;
    return (
        <>
            {/* Header */}
            <header className="head">
                <h1>{copy.differ(entries.length, totalCaptures)}</h1>
            </header>

            <div className="stage">
                <div className="overview">
                    {/* Failed */}
                    <FailedSection model={model} view={view} />
                    {/* Areas */}
                    <AreaSection model={model} view={view} marks={marks} />
                    {/* Same change */}
                    <SameChangeSection model={model} view={view} />
                    {/* Biggest changes */}
                    <BiggestSection model={model} view={view} />
                    {/* Components with no story */}
                    <MissingSection model={model} />
                </div>
            </div>
        </>
    );
}
