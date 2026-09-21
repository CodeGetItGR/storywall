'use client';

import { useTranslations } from 'next-intl';

import { ModuleRegistryPanel } from '@/components/admin/ModuleRegistryPanel';

export function PlansSettingsModules() {
    const t = useTranslations('AdminPage.plans');

    return (
        <div className="min-w-0 flex-1">
            {/* Header */}
            <header className="mb-4">
                <h2 className="text-xl font-semibold tracking-tight text-ink">{t('settings.modulesTitle')}</h2>
            </header>
            <ModuleRegistryPanel />
        </div>
    );
}
