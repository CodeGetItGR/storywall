import { AlertTriangle } from 'lucide-react';

import { AdminConsole } from '@/components/admin/AdminConsole';

interface AdminPageStateProps {
    accessDeniedBody: string;
    accessDeniedTitle: string;
    isAdmin: boolean;
    isBootstrapping: boolean;
    loadingMessage: string;
}

export function AdminPageState({ accessDeniedBody, accessDeniedTitle, isAdmin, isBootstrapping, loadingMessage }: AdminPageStateProps) {
    if (isBootstrapping) {
        return <AdminAccessLoading message={loadingMessage} />;
    }

    if (!isAdmin) {
        return <AdminAccessDenied title={accessDeniedTitle} body={accessDeniedBody} />;
    }

    return <AdminConsole />;
}

function AdminAccessLoading({ message }: { message: string }) {
    return <div className="px-6 py-10 text-sm text-ink-muted">{message}</div>;
}

function AdminAccessDenied({ title, body }: { title: string; body: string }) {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold text-ink">{title}</h1>
            <p className="mt-2 text-sm text-ink-muted">{body}</p>
        </div>
    );
}
