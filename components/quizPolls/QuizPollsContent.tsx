'use client';

import { useTranslations } from 'next-intl';

import { HostSettingsSection } from '@/components/quizPolls/HostSettingsSection';
import { QuestionEditorModal } from '@/components/quizPolls/QuestionEditorModal';
import { QuestionList } from '@/components/quizPolls/QuestionList';
import { QuizResults } from '@/components/quizPolls/QuizResults';
import { useQuizPollsQuestionEditor } from '@/hooks/useQuizPollsQuestionEditor';
import type { QuizPollsResultsDto, QuizPollsViewDto } from '@/lib/api/types';
import type { SideLabels } from '@/lib/quizPolls';

/** The loaded page: status, results, questions, and the host's settings. */
export function QuizPollsContent({
    eventId,
    view,
    results,
    isHost,
    memberId,
    sides,
    defaultSides,
    closesOn,
}: {
    eventId: string;
    view: QuizPollsViewDto;
    results: QuizPollsResultsDto | undefined;
    isHost: boolean;
    memberId: string | null;
    sides: SideLabels;
    defaultSides: SideLabels;
    closesOn: string | null;
}) {
    const t = useTranslations('QuizPollsPage');
    const editor = useQuizPollsQuestionEditor(eventId, results);

    return (
        <div className="space-y-10">
            {/* Status */}
            {view.status === 'CLOSED' ? (
                <p className="text-center text-base font-semibold text-ink">{t('closed')}</p>
            ) : (
                closesOn && <p className="text-center text-sm text-ink-muted">{t('closesOn', { date: closesOn })}</p>
            )}

            {/* Results */}
            <QuizResults view={view} memberId={memberId} />

            {/* Questions */}
            <QuestionList
                eventId={eventId}
                view={view}
                isHost={isHost}
                sides={sides}
                results={results}
                onAddAction={editor.openCreate}
                onEditAction={editor.openEdit}
            />
            {isHost && <QuestionEditorModal editor={editor} sides={sides} />}

            {/* Settings */}
            {isHost && <HostSettingsSection eventId={eventId} view={view} defaultSides={defaultSides} />}
        </div>
    );
}
