'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminConsole } from '@/components/admin/AdminConsole';
import { useAuth } from '@/hooks/useAuth';

export default function AdminPage() {
    const t = useTranslations('AdminPage');
    const { user, isBootstrapping } = useAuth();

    if (isBootstrapping) {
        return <div className="px-6 py-10 text-sm text-ink-muted">{t('checkingAccess')}</div>;
    }

    if (user?.role !== 'ADMIN') {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                    <AlertTriangle className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-semibold text-ink">{t('accessDenied.title')}</h1>
                <p className="mt-2 text-sm text-ink-muted">{t('accessDenied.body')}</p>
            </div>
        );
    }

    return <AdminConsole />;
}
