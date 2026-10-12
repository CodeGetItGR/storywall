import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HeOrSheViewDto } from '@/lib/api/types';

import { GuessSection } from './GuessSection';

const send = vi.fn();
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useHeOrShe', () => ({
    useSendHeOrSheAnswers: () => ({ mutateAsync: send, isPending: false, error: null }),
}));

function view(overrides: Partial<HeOrSheViewDto> = {}): HeOrSheViewDto {
    return {
        status: 'OPEN',
        closesAt: null,
        canGuess: true,
        myGuess: null,
        tally: null,
        questions: [],
        myAnswers: {},
        ...overrides,
    };
}

const weight = { id: 'q1', answerType: 'NUMBER' as const, prompt: 'Weight?', options: null, sortOrder: 0 };

afterEach(cleanup);
beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue(view());
});

describe('GuessSection', () => {
    it('asks for a guess first, then sends it with the optional answers in canonical form', async () => {
        render(<GuessSection eventId="e1" view={view({ questions: [weight] })} closesOn={null} />);

        const sendButton = screen.getByRole('button', { name: 'send' });
        expect(sendButton).toHaveProperty('disabled', true);
        expect(screen.getByText('optional')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'she' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Weight?' }), { target: { value: '3,5' } });
        fireEvent.click(sendButton);

        await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ guess: 'SHE', answers: [{ questionId: 'q1', value: '3.5' }] }));
    });

    it('leaves out an extra question the member skipped', async () => {
        render(<GuessSection eventId="e1" view={view({ questions: [weight] })} closesOn={null} />);
        fireEvent.click(screen.getByRole('button', { name: 'he' }));
        fireEvent.click(screen.getByRole('button', { name: 'send' }));
        await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ guess: 'HE', answers: [] }));
    });

    it('blocks a value the server would refuse', () => {
        render(<GuessSection eventId="e1" view={view({ questions: [weight] })} closesOn={null} />);
        fireEvent.click(screen.getByRole('button', { name: 'he' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Weight?' }), { target: { value: 'heavy' } });

        expect(screen.getByText('answerErrors.invalidNumber')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'send' })).toHaveProperty('disabled', true);
    });

    it('after guessing, shows the tally and thanks, and lets the member change their answers', () => {
        render(<GuessSection eventId="e1" view={view({ myGuess: 'HE', tally: { he: 2, she: 1 } })} closesOn={null} />);

        expect(screen.queryByRole('button', { name: 'send' })).toBeNull();
        expect(screen.getByText('thanks')).toBeTruthy();
        expect(screen.getByText('guesses:{"count":3}')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'changeAnswers' }));
        expect(screen.getByRole('button', { name: 'he' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('once voting closes, shows the final split to someone who never voted, and no form', () => {
        render(<GuessSection eventId="e1" view={view({ status: 'CLOSED', canGuess: false, tally: { he: 3, she: 1 } })} closesOn={null} />);

        expect(screen.getByText('closed')).toBeTruthy();
        expect(screen.getByText('guesses:{"count":4}')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'send' })).toBeNull();
        expect(screen.queryByText('notOpen')).toBeNull();
    });

    it('says when guessing is not open yet', () => {
        render(<GuessSection eventId="e1" view={view({ canGuess: false })} closesOn={null} />);
        expect(screen.getByText('notOpen')).toBeTruthy();
    });

    it('shows the closing time while open', () => {
        render(<GuessSection eventId="e1" view={view()} closesOn="Nov 1, 2026, 6:00 PM" />);
        expect(screen.getByText('closesOn:{"date":"Nov 1, 2026, 6:00 PM"}')).toBeTruthy();
    });
});
