'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { usePlanUpgradeHref } from '@/hooks/usePlanUpgradeHref';
import { QUIZ_POLLS_MODULE, useQuizPolls, useQuizPollsResults } from '@/hooks/useQuizPolls';
import { formatDate } from '@/lib/datetime';
import { defaultSideLabelKeys, type SideLabels } from '@/lib/quizPolls';
import { routes } from '@/lib/routes';
import { useActiveEvent, useActiveMember, useIsHost } from '@/providers/EventProvider';

/** What the Quiz & Polls page needs: the event, the caller's role, the view and (for hosts) the results. */
export function useQuizPollsPage() {
    const t = useTranslations('QuizPollsPage');
    const event = useActiveEvent();
    const member = useActiveMember();
    const isHost = useIsHost();
    const eventId = event?.id ?? '';
    const view = useQuizPolls(event?.id ?? null);
    const results = useQuizPollsResults(event?.id ?? null, isHost);
    const readable = useModuleReadable(event?.id ?? null, QUIZ_POLLS_MODULE);
    const copy = useModuleCopy(event?.eventType)(QUIZ_POLLS_MODULE);
    const upgradeHref = usePlanUpgradeHref(eventId);
    const locale = useLocale();
    const closesAt = view.data?.closesAt;

    const defaults = defaultSideLabelKeys(event?.eventType);
    const defaultSides: SideLabels = { he: t(`sides.${defaults.he}`), she: t(`sides.${defaults.she}`) };
    const sides: SideLabels = { he: view.data?.heLabel ?? defaultSides.he, she: view.data?.sheLabel ?? defaultSides.she };

    function retry() {
        void view.refetch();
    }

    return {
        eventId,
        isHost,
        memberId: member?.id ?? null,
        // Only once the event is known: before that, readability isn't decided yet.
        unavailable: Boolean(event) && !readable,
        view,
        results,
        sides,
        defaultSides,
        title: copy.name,
        backHref: routes.events.feed(eventId),
        upgradeHref,
        closesOn: closesAt ? formatDate(locale, closesAt, { dateStyle: 'medium', timeStyle: 'short' }) : null,
        retry,
    };
}
