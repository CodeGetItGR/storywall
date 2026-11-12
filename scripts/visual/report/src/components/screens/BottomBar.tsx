import { clsx } from 'clsx';

import { copy } from '../../copy';
import { useBottomBar } from '../../hooks/useBottomBar';
import type { ReportView } from '../../hooks/useReportView';
import type { Marks } from '../../lib/marks';
import type { ReportModel } from '../../lib/model';

type BottomBarProps = { model: ReportModel; view: ReportView; marks: Marks };

export function BottomBar({ model, view, marks }: BottomBarProps) {
    const bar = useBottomBar(model, view, marks);

    return (
        <footer className="bar">
            {/* Position */}
            {!bar.onOverview && (
                <button type="button" className="btn" disabled={bar.previousDisabled} onClick={view.goPrevious}>
                    {copy.previous}
                </button>
            )}
            <span className="position">{bar.position}</span>
            {!bar.onOverview && (
                <button type="button" className="btn" disabled={bar.nextDisabled} onClick={view.goNext}>
                    {copy.next}
                </button>
            )}
            <span className="spacer" />

            {/* Review actions. Start and the mark share one button, so keyboard focus stays on it as it changes. */}
            {bar.action && (
                <button type="button" className={clsx('btn', bar.action.primary && 'btn-primary')} onClick={bar.action.run}>
                    {bar.action.label}
                </button>
            )}
            {bar.actions.approve === 'link' && (
                <a className="btn btn-primary" href={model.manifest.pull?.url} target="_blank" rel="noreferrer">
                    {copy.approve}
                </a>
            )}
            {bar.actions.approve === 'blocked' && <span className="position">{copy.fixFailedFirst}</span>}

            {/* Help */}
            <button type="button" className="btn help-button" aria-label={copy.shortcuts} onClick={view.openHelp}>
                ?
            </button>
        </footer>
    );
}
