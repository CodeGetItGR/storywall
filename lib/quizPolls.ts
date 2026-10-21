import type { QuizAnswerType, QuizPollsQuestion, QuizQuestionKind } from '@/lib/api/types';

// Limits the backend enforces (quiz-polls-fe-integration.md). Checked here for UX only.
export const QUIZ_POLLS_MAX_QUESTIONS = 30;
export const QUIZ_POLLS_SIDE_LABEL_MAX = 40;

// A quiz question needs an exact answer, so only these types can be one.
export const QUIZ_TYPES: QuizAnswerType[] = ['CHOICE', 'YES_NO', 'HE_SHE'];
export const POLL_TYPES: QuizAnswerType[] = ['CHOICE', 'YES_NO', 'HE_SHE', 'DATE', 'TIME', 'NUMBER', 'FILL_GAP', 'FREE_TEXT'];

export function typesFor(kind: QuizQuestionKind): QuizAnswerType[] {
    return kind === 'QUIZ' ? QUIZ_TYPES : POLL_TYPES;
}

/** Answered by picking one of a fixed set, so it shows as choice rows rather than an input. */
export function isPickType(type: QuizAnswerType): boolean {
    return type === 'CHOICE' || type === 'YES_NO' || type === 'HE_SHE';
}

export type SideLabels = {
    he: string;
    she: string;
};

/** Message keys for the two sides of a He/She question when the host hasn't named them. */
export function defaultSideLabelKeys(eventType: string | null | undefined): { he: 'groom' | 'dad'; she: 'bride' | 'mum' } {
    return eventType === 'BAPTISM' ? { he: 'dad', she: 'mum' } : { he: 'groom', she: 'bride' };
}

export interface PickOption {
    value: string;
    label: string;
}

/** The canonical values a pick question offers, in display order. */
export function pickOptions(
    question: Pick<QuizPollsQuestion, 'answerType' | 'options'>,
    sides: SideLabels,
    yesNo: { yes: string; no: string },
): PickOption[] {
    switch (question.answerType) {
        case 'HE_SHE':
            return [
                { value: 'HE', label: sides.he },
                { value: 'SHE', label: sides.she },
            ];
        case 'YES_NO':
            return [
                { value: 'YES', label: yesNo.yes },
                { value: 'NO', label: yesNo.no },
            ];
        case 'CHOICE':
            return (question.options ?? []).map((option) => ({ value: option.id, label: option.label }));
        default:
            return [];
    }
}

/** A whole percentage of {@code total}; 0 with no answers. */
export function percentOf(count: number, total: number): number {
    return total === 0 ? 0 : Math.round((count / total) * 100);
}

/** The count for each value given. */
export function countsByValue(tally: QuizPollsQuestion['tally']): Map<string, number> {
    return new Map((tally ?? []).map((entry) => [entry.value, entry.count]));
}

export function tallyTotal(tally: QuizPollsQuestion['tally']): number {
    return (tally ?? []).reduce((sum, entry) => sum + entry.count, 0);
}
