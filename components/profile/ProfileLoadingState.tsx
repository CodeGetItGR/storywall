'use client';

export function ProfileLoadingState() {
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[0, 1].map((i) => (
                <div key={i} className="overflow-hidden rounded-2xl bg-card">
                    <div className="aspect-video animate-pulse bg-surface-muted" />
                    <div className="space-y-2 p-4">
                        <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
                        <div className="h-3 w-44 animate-pulse rounded bg-surface-muted" />
                    </div>
                </div>
            ))}
        </div>
    );
}
