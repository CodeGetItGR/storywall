import { copy } from '../../copy';

export function FailedNotice({ error }: { error: string | null }) {
    return (
        <div className="error">
            <b>{copy.storyFailed}</b>
            {/* Storybook can report an empty message. */}
            <pre>{error || copy.noErrorMessage}</pre>
            <span>{copy.fixBeforeApproval}</span>
        </div>
    );
}
