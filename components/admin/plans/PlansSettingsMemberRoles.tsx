'use client';

import { useTranslations } from 'next-intl';

import { MemberRolesPanel } from '@/components/admin/memberRoles/MemberRolesPanel';

export function PlansSettingsMemberRoles() {
    const t = useTranslations('AdminPage.plans');

    return (
        <div className="min-w-0 flex-1">
            {/* Header */}
            <header className="mb-4">
                <h2 className="text-xl font-semibold tracking-tight text-ink">{t('settings.memberRolesTitle')}</h2>
            </header>
            <MemberRolesPanel />
        </div>
    );
}
