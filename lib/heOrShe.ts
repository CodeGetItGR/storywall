import type { HeOrSheValue, QuizAnswerType, QuizQuestionDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { numberFormat } from '@/lib/format';

// Limits the backend enforces (he-or-she-quiz-fe-integration.md). Checked here for UX only.
export const HE_OR_SHE_MAX_QUESTIONS = 20;
export const QUIZ_PROMPT_MAX = 200;
export const QUIZ_OPTION_LABEL_MAX = 80;
export const QUIZ_MIN_OPTIONS = 2;
export const QUIZ_MAX_OPTIONS = 8;
export const QUIZ_FILL_GAP_MAX = 120;
export const QUIZ_FREE_TEXT_MAX = 1000;
const NUMBER_MAX_INTEGER_DIGITS = 12;
const NUMBER_MAX_DECIMALS = 3;

export const QUIZ_ANSWER_TYPES: QuizAnswerType[] = ['HE_SHE', 'YES_NO', 'CHOICE', 'DATE', 'TIME', 'NUMBER', 'FILL_GAP', 'FREE_TEXT'];

// The blank in a fill-in-the-gap prompt: three or more underscores.
const GAP = /_{3,}/;
const GAP_GLOBAL = /_{3,}/g;

export type QuizAnswerError = 'tooLong' | 'invalidNumber' | 'invalidDate' | 'invalidTime';

/** The canonical value the backend accepts for {@code input}, or null when the field is empty. */
export function toAnswerValue(type: QuizAnswerType, input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    switch (type) {
        case 'NUMBER':
            // Greek keyboards type a comma for the decimal point.
            return trimmed.replace(',', '.');
        case 'TIME':
            // <input type="time"> may add seconds.
            return trimmed.slice(0, 5);
        case 'FREE_TEXT':
            return input.trim();
        default:
            return trimmed;
    }
}

/** A message key for a value the backend would refuse, or null. */
export function answerError(type: QuizAnswerType, value: string | null): QuizAnswerError | null {
    if (value === null) return null;
    switch (type) {
        case 'NUMBER': {
            if (!/^-?\d+(\.\d+)?$/.test(value)) return 'invalidNumber';
            const [integer, decimals = ''] = value.replace('-', '').split('.');
            const digits = integer.replace(/^0+(?=\d)/, '');
            return digits.length > NUMBER_MAX_INTEGER_DIGITS || decimals.replace(/0+$/, '').length > NUMBER_MAX_DECIMALS ? 'invalidNumber' : null;
        }
        case 'DATE':
            return isRealDate(value) ? null : 'invalidDate';
        case 'TIME':
            return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? null : 'invalidTime';
        case 'FILL_GAP':
            return [...value].length > QUIZ_FILL_GAP_MAX ? 'tooLong' : null;
        case 'FREE_TEXT':
            return [...value].length > QUIZ_FREE_TEXT_MAX ? 'tooLong' : null;
        default:
            return null;
    }
}

function isRealDate(value: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export interface AnswerLabels {
    he: string;
    she: string;
    yes: string;
    no: string;
}

/** A stored value as the host reads it. */
export function formatAnswer(question: Pick<QuizQuestionDto, 'answerType' | 'options'>, value: string, locale: string, labels: AnswerLabels): string {
    switch (question.answerType) {
        case 'HE_SHE':
            return value === 'HE' ? labels.he : value === 'SHE' ? labels.she : value;
        case 'YES_NO':
            return value === 'YES' ? labels.yes : value === 'NO' ? labels.no : value;
        case 'CHOICE':
            return question.options?.find((option) => option.id === value)?.label ?? value;
        case 'DATE':
            // A calendar day, not an instant: format it in UTC so no timezone moves it.
            return isRealDate(value) ? formatDate(locale, `${value}T00:00:00Z`, { dateStyle: 'medium', timeZone: 'UTC' }) : value;
        case 'NUMBER': {
            const number = Number(value);
            return Number.isFinite(number) ? numberFormat(locale, { maximumFractionDigits: NUMBER_MAX_DECIMALS }).format(number) : value;
        }
        default:
            return value;
    }
}

export function heOrSheLabel(value: HeOrSheValue, labels: Pick<AnswerLabels, 'he' | 'she'>): string {
    return value === 'HE' ? labels.he : labels.she;
}

/** The prompt around its one blank. A prompt without one is all {@code before}. */
export function splitFillGap(prompt: string): { before: string; after: string } {
    const match = GAP.exec(prompt);
    if (!match) return { before: prompt, after: '' };
    return { before: prompt.slice(0, match.index), after: prompt.slice(match.index + match[0].length) };
}

/** Whether a fill-in-the-gap prompt has exactly one blank, as the backend requires. */
export function hasOneGap(prompt: string): boolean {
    return (prompt.match(GAP_GLOBAL) ?? []).length === 1;
}

/** Whole percentages that add up to 100; 0/0 with no votes. */
export function tallyPercent(tally: { he: number; she: number }): { he: number; she: number } {
    const total = tally.he + tally.she;
    if (total === 0) return { he: 0, she: 0 };
    const he = Math.round((tally.he / total) * 100);
    return { he, she: 100 - he };
}

/** Milliseconds until {@code revealAt}, or null when there is nothing to wait for. */
export function msUntilReveal(revealAt: string | null, now: number = Date.now()): number | null {
    if (!revealAt) return null;
    const at = Date.parse(revealAt);
    if (Number.isNaN(at)) return null;
    return Math.max(0, at - now);
}
