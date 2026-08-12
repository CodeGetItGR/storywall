'use client';

export function ProfileLoadingState() {
    return (
        <div className="mx-auto max-w-2xl px-4 pt-6 pb-24 lg:pb-8">
            <div className="flex items-center gap-4 rounded-2xl bg-card p-4">
                <div className="h-14 w-14 animate-pulse rounded-full bg-surface-muted" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
                    <div className="h-3 w-44 animate-pulse rounded bg-surface-muted" />
                </div>
            </div>
            <div className="mt-6 mb-3 ml-1 h-3 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="overflow-hidden rounded-2xl bg-card">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-surface-muted" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 w-28 animate-pulse rounded bg-surface-muted" />
                            <div className="h-3 w-16 animate-pulse rounded bg-surface-muted" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
