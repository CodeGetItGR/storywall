'use client';

import { Baby } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { GuessSection } from '@/components/heOrShe/GuessSection';
import { HeOrSheSkeleton } from '@/components/heOrShe/HeOrSheSkeleton';
import { HostSection } from '@/components/heOrShe/HostSection';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ModuleUnavailableState } from '@/components/tools/ModuleUnavailableState';
import { PageErrorState } from '@/components/ui/PageErrorState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useHeOrShePage } from '@/hooks/useHeOrShePage';

export default function HeOrShePage() {
    const t = useTranslations('HeOrShePage');
    const page = useHeOrShePage();
    const toErrorMessage = useApiErrorMessage();
    const view = page.view.data;

    if (page.unavailable) {
        return (
            <ModuleUnavailableState
                backHref={page.backHref}
                backLabel={t('backToTools')}
                body={t('unavailableBody')}
                icon={Baby}
                iconClassName="text-sky-500"
                title={t('unavailableTitle')}
                upgradeHref={page.upgradeHref}
            />
        );
    }

    return (
        <ModulePageShell
            maxWidth="xl"
            title={page.title}
            icon={Baby}
            iconClassName="text-sky-500"
            backLabel={t('backToTools')}
            backHref={page.backHref}
        >
            {view ? (
                <div className="space-y-10">
                    {/* Guess */}
                    <GuessSection eventId={page.eventId} view={view} revealOn={page.revealOn} />

                    {/* Host */}
                    {page.isHost && <HostSection eventId={page.eventId} view={view} results={page.results.data} />}
                </div>
            ) : page.view.isError ? (
                <PageErrorState
                    title={t('loadError')}
                    description={toErrorMessage(page.view.error)}
                    onRetryAction={page.retry}
                    retryLabel={t('retry')}
                    error={page.view.error}
                />
            ) : (
                <HeOrSheSkeleton />
            )}
        </ModulePageShell>
    );
}
