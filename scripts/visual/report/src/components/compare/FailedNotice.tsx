import { copy } from '../../copy';

export function FailedNotice({ error }: { error: string | null }) {
    return (
        <div className="error">
            <b>{copy.storyFailed}</b>
            <pre>{error ?? copy.noErrorMessage}</pre>
            <span>{copy.fixBeforeApproval}</span>
        </div>
    );
}
