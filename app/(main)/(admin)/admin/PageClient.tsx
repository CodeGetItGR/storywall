'use client';

import { useTranslations } from 'next-intl';

import { AdminPageState } from '@/components/admin/AdminPageState';
import { useAuth } from '@/hooks/useAuth';

export default function AdminPage() {
    const t = useTranslations('AdminPage');
    const { user, isBootstrapping } = useAuth();

    return (
        <AdminPageState
            accessDeniedBody={t('accessDenied.body')}
            accessDeniedTitle={t('accessDenied.title')}
            isAdmin={user?.role === 'ADMIN'}
            isBootstrapping={isBootstrapping}
            loadingMessage={t('checkingAccess')}
        />
    );
}
