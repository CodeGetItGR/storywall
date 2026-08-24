import { AlertTriangle } from 'lucide-react';

export function AdminAccessDenied({ title, body }: { title: string; body: string }) {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-status-danger-wash text-status-danger">
                <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold text-ink">{title}</h1>
            <p className="mt-2 text-sm text-ink-muted">{body}</p>
        </div>
    );
}
