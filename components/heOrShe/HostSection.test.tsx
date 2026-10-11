import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HeOrSheResultsDto, HeOrSheViewDto } from '@/lib/api/types';

import { HostSection } from './HostSection';

const updateSettings = vi.fn();
const createQuestion = vi.fn();
const updateQuestion = vi.fn();
const deleteQuestion = vi.fn();
const mutation = (fn: ReturnType<typeof vi.fn>) => ({ mutateAsync: fn, isPending: false, error: null, reset: vi.fn() });

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useHeOrShe', () => ({
    useUpdateHeOrSheSettings: () => mutation(updateSettings),
    useCreateHeOrSheQuestion: () => mutation(createQuestion),
    useUpdateHeOrSheQuestion: () => mutation(updateQuestion),
    useDeleteHeOrSheQuestion: () => mutation(deleteQuestion),
}));

function view(overrides: Partial<HeOrSheViewDto> = {}): HeOrSheViewDto {
    return {
        status: 'OPEN',
        closesAt: null,
        canGuess: true,
        myGuess: null,
        tally: { he: 0, she: 0 },
        questions: [],
        myAnswers: {},
        ...overrides,
    };
}

const hair = {
    id: 'q1',
    answerType: 'CHOICE' as const,
    prompt: 'Hair?',
    options: [
        { id: 'a', label: 'Dark' },
        { id: 'b', label: 'Fair' },
    ],
    sortOrder: 0,
};

afterEach(cleanup);
beforeEach(() => {
    for (const fn of [updateSettings, createQuestion, updateQuestion, deleteQuestion]) {
        fn.mockReset();
        fn.mockResolvedValue({});
    }
});

describe('HostSection closing time', () => {
    it('saves the closing time', async () => {
        const { container } = render(<HostSection eventId="e1" view={view()} results={undefined} />);

        expect(screen.getByRole('button', { name: 'save' })).toHaveProperty('disabled', true);
        fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '2026-11-01' } });
        fireEvent.change(container.querySelector('input[type="time"]')!, { target: { value: '18:00' } });
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await vi.waitFor(() => expect(updateSettings).toHaveBeenCalledWith({ closesAt: new Date(2026, 10, 1, 18, 0).toISOString() }));
    });

    it('asks for no answer', () => {
        render(<HostSection eventId="e1" view={view()} results={undefined} />);
        expect(screen.queryByRole('group', { name: 'secretAnswer' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'revealNow' })).toBeNull();
    });

    it('shows no settings and no edit controls once voting closes', () => {
        render(<HostSection eventId="e1" view={view({ status: 'CLOSED', canGuess: false, questions: [hair] })} results={undefined} />);
        expect(screen.queryByText('settingsTitle')).toBeNull();
        expect(screen.queryByRole('button', { name: 'addQuestion' })).toBeNull();
        expect(screen.getByRole('button', { name: /Hair\?/ })).toHaveProperty('disabled', true);
    });
});

describe('HostSection questions', () => {
    it('creates a multiple-choice question from the modal', async () => {
        render(<HostSection eventId="e1" view={view()} results={undefined} />);
        fireEvent.click(screen.getByRole('button', { name: 'addQuestion' }));

        fireEvent.change(await screen.findByLabelText('type'), { target: { value: 'CHOICE' } });
        fireEvent.change(screen.getByLabelText('prompt'), { target: { value: ' Hair? ' } });
        fireEvent.change(screen.getByLabelText('option:{"number":1}'), { target: { value: 'Dark' } });
        fireEvent.change(screen.getByLabelText('option:{"number":2}'), { target: { value: 'Fair' } });
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await vi.waitFor(() => expect(createQuestion).toHaveBeenCalledWith({ answerType: 'CHOICE', prompt: 'Hair?', options: ['Dark', 'Fair'] }));
    });

    it('needs a blank in a fill-in-the-gap prompt', async () => {
        render(<HostSection eventId="e1" view={view()} results={undefined} />);
        fireEvent.click(screen.getByRole('button', { name: 'addQuestion' }));
        fireEvent.change(await screen.findByLabelText('type'), { target: { value: 'FILL_GAP' } });
        fireEvent.change(screen.getByLabelText('prompt'), { target: { value: 'No blank' } });

        expect(screen.getByRole('button', { name: 'save' })).toHaveProperty('disabled', true);
        fireEvent.change(screen.getByLabelText('prompt'), { target: { value: 'Eyes will be ___' } });
        expect(screen.getByRole('button', { name: 'save' })).toHaveProperty('disabled', false);
    });

    it("locks an answered question's options and keeps its type", async () => {
        const results: HeOrSheResultsDto = {
            main: [],
            questions: [{ questionId: 'q1', answers: [{ memberId: 'm1', displayName: 'Ann', avatarUrl: null, value: 'a' }] }],
        };
        render(<HostSection eventId="e1" view={view({ questions: [hair] })} results={results} />);
        fireEvent.click(screen.getByRole('button', { name: /Hair\?/ }));

        expect(await screen.findByText('optionsLocked')).toBeTruthy();
        expect(screen.getByLabelText('type')).toHaveProperty('disabled', true);
        fireEvent.change(screen.getByLabelText('prompt'), { target: { value: 'Hair colour?' } });
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await vi.waitFor(() => expect(updateQuestion).toHaveBeenCalledWith({ questionId: 'q1', patch: { prompt: 'Hair colour?' } }));
    });

    it('deletes a question only after confirming', async () => {
        render(<HostSection eventId="e1" view={view({ questions: [hair] })} results={undefined} />);
        fireEvent.click(screen.getByRole('button', { name: /Hair\?/ }));
        fireEvent.click(await screen.findByRole('button', { name: 'deleteQuestion' }));
        expect(deleteQuestion).not.toHaveBeenCalled();

        fireEvent.click(await screen.findByRole('button', { name: 'deleteConfirmAction' }));
        await vi.waitFor(() => expect(deleteQuestion).toHaveBeenCalledWith('q1'));
    });
});

describe('HostSection results', () => {
    it('lists guesses and answers by name, with option labels', () => {
        const results: HeOrSheResultsDto = {
            main: [
                { memberId: 'm1', displayName: 'Ann', avatarUrl: null, guess: 'HE' },
                { memberId: 'm2', displayName: 'Bob', avatarUrl: null, guess: 'SHE' },
            ],
            questions: [{ questionId: 'q1', answers: [{ memberId: 'm1', displayName: 'Ann', avatarUrl: null, value: 'b' }] }],
        };
        render(<HostSection eventId="e1" view={view({ questions: [hair] })} results={results} />);

        expect(screen.getByText('Bob')).toBeTruthy();
        expect(screen.getAllByText('Ann')).toHaveLength(2);
        expect(screen.getByText('Fair')).toBeTruthy();
    });
});
