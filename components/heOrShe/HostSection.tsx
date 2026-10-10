'use client';

import { HostResults } from '@/components/heOrShe/HostResults';
import { HostSettingsSection } from '@/components/heOrShe/HostSettingsSection';
import { QuestionEditorModal } from '@/components/heOrShe/QuestionEditorModal';
import { QuestionRows } from '@/components/heOrShe/QuestionRows';
import { useHeOrSheQuestionEditor } from '@/hooks/useHeOrSheQuestionEditor';
import type { HeOrSheResultsDto, HeOrSheViewDto } from '@/lib/api/types';

/** The host's part of the page: settings, extra questions, and everyone's answers. */
export function HostSection({ eventId, view, results }: { eventId: string; view: HeOrSheViewDto; results: HeOrSheResultsDto | undefined }) {
    const editor = useHeOrSheQuestionEditor(eventId, results);
    const locked = view.status === 'CLOSED';

    return (
        <div className="space-y-10">
            {/* Settings */}
            <HostSettingsSection eventId={eventId} view={view} />

            {/* Questions */}
            <QuestionRows questions={view.questions} locked={locked} onAddAction={editor.openCreate} onEditAction={editor.openEdit} />
            <QuestionEditorModal editor={editor} />

            {/* Results */}
            <HostResults questions={view.questions} results={results} />
        </div>
    );
}
