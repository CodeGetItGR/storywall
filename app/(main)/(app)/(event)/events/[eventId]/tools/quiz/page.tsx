import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { QUIZ_POLLS_MODULE, quizPollsKeys } from '@/hooks/useQuizPolls';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet, serverModuleReadable } from '@/lib/api/serverFetch';
import type { QuizPollsViewDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import QuizPollsPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the Quiz & Polls view so the page renders at once. The host-only results load on the
// client: telling host from guest here would cost another call for a folded-away list.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            if (!(await serverModuleReadable(eventId, QUIZ_POLLS_MODULE, accessToken))) throw new Error('quiz_polls unavailable');
            const view = await serverGet<QuizPollsViewDto>(endpoints.events.quizPolls(eventId), accessToken);
            queryClient.setQueryData(quizPollsKeys.view(eventId), view);
        } catch {
            // Best-effort — the client hooks fetch normally if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <QuizPollsPage />
        </HydrationBoundary>
    );
}
