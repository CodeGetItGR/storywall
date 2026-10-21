'use client';

import { MessageCircleQuestion } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { QuizPollsContent } from '@/components/quizPolls/QuizPollsContent';
import { QuizPollsSkeleton } from '@/components/quizPolls/QuizPollsSkeleton';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ModuleUnavailableState } from '@/components/tools/ModuleUnavailableState';
import { PageErrorState } from '@/components/ui/PageErrorState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useQuizPollsPage } from '@/hooks/useQuizPollsPage';

export default function QuizPollsPage() {
    const t = useTranslations('QuizPollsPage');
    const page = useQuizPollsPage();
    const toErrorMessage = useApiErrorMessage();
    const view = page.view.data;

    if (page.unavailable) {
        return (
            <ModuleUnavailableState
                backHref={page.backHref}
                backLabel={t('backToTools')}
                body={t('unavailableBody')}
                icon={MessageCircleQuestion}
                iconClassName="text-orange-500"
                title={t('unavailableTitle')}
                upgradeHref={page.upgradeHref}
            />
        );
    }

    return (
        <ModulePageShell
            maxWidth="xl"
            title={page.title}
            icon={MessageCircleQuestion}
            iconClassName="text-orange-500"
            backLabel={t('backToTools')}
            backHref={page.backHref}
        >
            {view ? (
                <QuizPollsContent
                    eventId={page.eventId}
                    view={view}
                    results={page.results.data}
                    isHost={page.isHost}
                    memberId={page.memberId}
                    sides={page.sides}
                    defaultSides={page.defaultSides}
                    closesOn={page.closesOn}
                />
            ) : page.view.isError ? (
                <PageErrorState
                    title={t('loadError')}
                    description={toErrorMessage(page.view.error)}
                    onRetryAction={page.retry}
                    retryLabel={t('retry')}
                    error={page.view.error}
                />
            ) : (
                <QuizPollsSkeleton />
            )}
        </ModulePageShell>
    );
}
