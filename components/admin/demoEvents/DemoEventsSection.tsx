'use client';

import { useTranslations } from 'next-intl';

import { DemoEventDetail } from '@/components/admin/demoEvents/DemoEventDetail';
import { DemoEventsTable } from '@/components/admin/demoEvents/DemoEventsTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useDemoEventsPanel } from '@/hooks/useDemoEventsPanel';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function DemoEventsSection() {
    const t = useTranslations('AdminPage');
    const panel = useDemoEventsPanel();
    const ready = !panel.isLoading && !panel.error;

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header (list only; the detail page has its own) */}
            {!panel.selectedKey && (
                <header className="mb-5">
                    <p className="text-[11px] font-bold tracking-[0.14em] text-primary-dark uppercase">{t('eyebrow')}</p>
                    <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('demoEvents.title')}</h1>
                </header>
            )}

            {panel.isLoading && <LoadingState label={t('demoEvents.loading')} className="justify-start py-6" />}
            {Boolean(panel.error) && <p className="py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(panel.error)}`)}</p>}

            {/* Content */}
            {ready && panel.selectedRow && <DemoEventDetail key={panel.selectedRow.eventType.eventTypeKey} row={panel.selectedRow} />}
            {ready && panel.selectedKey && !panel.selectedRow && <p className="py-6 text-sm text-ink-muted">{t('errors.notFound')}</p>}
            {ready && !panel.selectedKey && panel.rows.length === 0 && <p className="py-6 text-sm text-ink-muted">{t('demoEvents.empty')}</p>}
            {ready && !panel.selectedKey && panel.rows.length > 0 && <DemoEventsTable rows={panel.rows} />}
        </div>
    );
}
