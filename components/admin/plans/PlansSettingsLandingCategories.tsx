'use client';

import { useTranslations } from 'next-intl';

import { LandingCategoriesPanel } from '@/components/admin/landingCategories/LandingCategoriesPanel';

export function PlansSettingsLandingCategories() {
    const t = useTranslations('AdminPage.plans');

    return (
        <div className="min-w-0 flex-1">
            {/* Header */}
            <header className="mb-4">
                <h2 className="text-xl font-semibold tracking-tight text-ink">{t('settings.landingCategoriesTitle')}</h2>
            </header>
            <LandingCategoriesPanel />
        </div>
    );
}
