import { copy } from '../../copy';
import type { Marks } from '../../lib/marks';
import type { ReportModel } from '../../lib/model';
import { reviewProgress } from '../../lib/reviewOrder';

type SidebarHeaderProps = { model: ReportModel; marks: Marks };

export function SidebarHeader({ model, marks }: SidebarHeaderProps) {
    const { pull, headSha } = model.manifest;
    const { done, total } = reviewProgress(model, marks);
    return (
        <>
            {/* Identity */}
            <div className="brand">
                <b>{copy.title}</b>
                {pull && (
                    <a className="mono" href={pull.url} target="_blank" rel="noreferrer">
                        {copy.pull(pull.number)}
                    </a>
                )}
                <span className="mono">{headSha.slice(0, 7)}</span>
            </div>

            {/* Progress */}
            <div className="progress">
                <span>
                    <span className="mono">{copy.position(done, total)}</span> {copy.capturesReviewed(total)}
                </span>
                <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                </div>
            </div>
        </>
    );
}
