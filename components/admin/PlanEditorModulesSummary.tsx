'use client';

import { useTranslations } from 'next-intl';

export function PlanEditorModulesSummary({ id, included, total, onOpenGridAction }: { id: string; included: number; total: number; onOpenGridAction: () => void }) {
    const t = useTranslations('AdminPage.plans');

    return (
        <section id={id} className="scroll-mt-14 pt-6">
            {/* Modules */}
            <h4 className="mb-2 text-sm font-bold text-ink">{t('sections.modules')}</h4>
            <p className="text-sm text-ink-muted">
                {t('coverage.modulesCount', { count: included, total })}{' '}
                <button type="button" onClick={onOpenGridAction} className="font-semibold text-primary-dark underline-offset-2 hover:underline">
                    {t('editInGrid')}
                </button>
            </p>
        </section>
    );
}
