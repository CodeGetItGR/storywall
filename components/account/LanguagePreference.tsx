'use client';

import { useTranslations } from 'next-intl';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function LanguagePreference() {
    const t = useTranslations('AccountDrawer');

    return (
        <section className="rounded-2xl border border-border bg-card p-4" aria-labelledby="language-preference-heading">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 id="language-preference-heading" className="text-sm font-medium text-ink">
                        {t('preferences.language')}
                    </h2>
                </div>
                <LanguageSwitcher />
            </div>
        </section>
    );
}
