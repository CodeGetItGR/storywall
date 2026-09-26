'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ModuleUnavailableState } from '@/components/tools/ModuleUnavailableState';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePlanUpgradeHref } from '@/hooks/usePlanUpgradeHref';
import { useRsvpReportPage } from '@/hooks/useRsvpReportPage';
import type { RsvpReportType } from '@/lib/api/types';
import { routes } from '@/lib/routes';

import { RsvpReportActions } from './RsvpReportActions';
import { RsvpReportView } from './RsvpReportView';

export function RsvpReportScreen({ reportType }: { reportType: RsvpReportType }) {
    const t = useTranslations('ManagePage.rsvpReport');
    const page = useRsvpReportPage(reportType);
    const upgradeHref = usePlanUpgradeHref(page.eventId);

    if (!page.isModuleReadable) {
        return (
            <ModuleUnavailableState
                backHref={routes.events.manage(page.eventId, { tab: 'rsvp', section: 'reports' })}
                backLabel={t('close')}
                body={t('unavailableBody')}
                icon={Users}
                iconClassName="text-emerald-500"
                title={t('unavailableTitle')}
                upgradeHref={upgradeHref}
            />
        );
    }

    return (
        <div data-print-root className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
            {/* Actions */}
            <RsvpReportActions isDownloading={page.isDownloading} onPrint={page.onPrint} onDownload={page.onDownload} onClose={page.onClose} />
            {page.downloadError && (
                <p role="alert" className="text-right text-xs text-rose-600 print:hidden">
                    {page.downloadError}
                </p>
            )}

            {/* Report */}
            {page.report ? (
                <RsvpReportView report={page.report} />
            ) : page.isError ? (
                <p className="text-sm text-rose-600">{t('loadFailed')}</p>
            ) : (
                <LoadingState size="md" className="min-h-64" />
            )}
        </div>
    );
}
