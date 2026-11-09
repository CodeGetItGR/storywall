type EditorNoticeProps = {
    tone: 'error' | 'info';
    message: string;
    actionLabel?: string;
    onAction?: () => void;
};

// One line under the top bar: a save that failed, or a short note after an action.
export function EditorNotice({ tone, message, actionLabel, onAction }: EditorNoticeProps) {
    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            className={
                tone === 'error'
                    ? 'flex shrink-0 items-center justify-center gap-3 bg-rose-700 px-4 py-2 text-sm font-semibold text-white'
                    : 'flex shrink-0 items-center justify-center gap-3 bg-(--smd-editor-control) px-4 py-2 text-sm font-medium text-(--smd-editor-text)'
            }
        >
            <span className="min-w-0">{message}</span>
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="shrink-0 rounded-md bg-white px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
