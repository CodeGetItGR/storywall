'use client';

interface PostModalStatusProps {
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

// A post the modal can't show: not found, or failed to load.
export function PostModalStatus({ title, description, actionLabel, onAction }: PostModalStatusProps) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="mb-1 text-base font-semibold text-ink">{title}</p>
            {description && <p className="text-sm text-ink-muted">{description}</p>}
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-5 inline-flex min-h-11 items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
