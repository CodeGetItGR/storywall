import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { AdminAccessLoading } from '@/components/admin/AdminAccessLoading';
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
