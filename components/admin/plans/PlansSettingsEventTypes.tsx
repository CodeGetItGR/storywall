'use client';

import { useTranslations } from 'next-intl';

import { EventTypeRegistryPanel } from '@/components/admin/EventTypeRegistryPanel';

export function PlansSettingsEventTypes() {
    const t = useTranslations('AdminPage.plans');

    return (
        <div className="min-w-0 flex-1">
            {/* Header */}
            <header className="mb-4">
                <h2 className="text-xl font-semibold tracking-tight text-ink">{t('settings.eventTypesTitle')}</h2>
            </header>
            <EventTypeRegistryPanel />
        </div>
    );
}
