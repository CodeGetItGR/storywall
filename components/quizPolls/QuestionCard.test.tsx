import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QuizPollsQuestion, QuizPollsViewDto } from '@/lib/api/types';

import { QuestionCard } from './QuestionCard';

const send = vi.fn();
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useQuizPolls', () => ({
    useAnswerQuizPollsQuestion: () => ({ mutateAsync: send, isPending: false, error: null }),
}));

const sides = { he: 'Groom', she: 'Bride' };

function question(overrides: Partial<QuizPollsQuestion> = {}): QuizPollsQuestion {
    return {
        id: 'q1',
        kind: 'POLL',
        answerType: 'HE_SHE',
        prompt: 'Who cooks?',
        options: null,
        sortOrder: 0,
        myAnswer: null,
        correctValue: null,
        tally: null,
        ...overrides,
    };
}

function view(overrides: Partial<QuizPollsViewDto> = {}): QuizPollsViewDto {
    return {
        status: 'OPEN',
        closesAt: null,
        canAnswer: true,
        heLabel: null,
        sheLabel: null,
        questions: [],
        myScore: null,
        leaderboard: null,
        ...overrides,
    };
}

function renderCard(q: QuizPollsQuestion, options: { isHost?: boolean; view?: QuizPollsViewDto } = {}) {
    return render(
        <ul>
            <QuestionCard
                eventId="e1"
                question={q}
                view={options.view ?? view()}
                isHost={options.isHost ?? false}
                sides={sides}
                results={undefined}
                onEditAction={vi.fn()}
            />
        </ul>,
    );
}

afterEach(cleanup);
beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue(question());
});

describe('QuestionCard', () => {
    it('sends a pick the moment it is tapped, using the host-named sides', async () => {
        renderCard(question());
        fireEvent.click(screen.getByRole('button', { name: 'Bride' }));
        await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ questionId: 'q1', value: 'SHE' }));
    });

    it('shows each share and the vote count once a poll has a tally', () => {
        renderCard(
            question({
                myAnswer: 'HE',
                tally: [
                    { value: 'HE', count: 3 },
                    { value: 'SHE', count: 1 },
                ],
            }),
        );
        expect(screen.getByText('75%')).toBeTruthy();
        expect(screen.getByText('votes:{"count":4}')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Groom/ }).getAttribute('aria-pressed')).toBe('true');
    });

    it('tells a guest a quiz answer waits for the results', () => {
        renderCard(question({ kind: 'QUIZ', myAnswer: 'HE' }));
        expect(screen.getByText('resultsAtClose')).toBeTruthy();
    });

    it("doesn't let the host answer a quiz question", () => {
        renderCard(question({ kind: 'QUIZ', correctValue: 'SHE' }), { isHost: true });
        expect(screen.getByRole('button', { name: /Groom/ })).toHaveProperty('disabled', true);
        expect(screen.queryByText('resultsAtClose')).toBeNull();
    });

    it('lets a guest type and send a free-text poll answer', async () => {
        renderCard(question({ answerType: 'FREE_TEXT', prompt: 'Best memory?' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Best memory?' }), { target: { value: 'The trip' } });
        fireEvent.click(screen.getByRole('button', { name: 'send' }));
        await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ questionId: 'q1', value: 'The trip' }));
    });
});
