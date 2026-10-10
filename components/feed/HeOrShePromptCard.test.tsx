import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HeOrSheViewDto } from '@/lib/api/types';

import { HeOrShePromptCard } from './HeOrShePromptCard';

const send = vi.fn();
const push = vi.fn();
let current: HeOrSheViewDto | undefined;
let accessMode = 'member';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => () => ({ name: 'Boy or Girl?' }) }));
vi.mock('@/providers/EventProvider', () => ({ useContentAccessMode: () => accessMode }));
vi.mock('@/hooks/useHeOrShe', () => ({
    HE_OR_SHE_MODULE: 'he_or_she',
    useHeOrShe: (eventId: string | null) => ({ data: eventId ? current : undefined }),
    useSendHeOrSheAnswers: () => ({ mutateAsync: send, isPending: false, error: null }),
}));

function view(overrides: Partial<HeOrSheViewDto> = {}): HeOrSheViewDto {
    return {
        status: 'OPEN',
        revealAt: null,
        canGuess: true,
        myGuess: null,
        tally: null,
        result: null,
        answer: null,
        questions: [],
        myAnswers: {},
        ...overrides,
    };
}

const weight = { id: 'q1', answerType: 'NUMBER' as const, prompt: 'Weight?', options: null, sortOrder: 0 };

afterEach(cleanup);
beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue(view({ myGuess: 'HE' }));
    push.mockReset();
    current = view();
    accessMode = 'member';
});

describe('HeOrShePromptCard', () => {
    it('saves a guess from the feed and stays on it when there are no extra questions', async () => {
        render(<HeOrShePromptCard eventId="e1" eventType={null} enabled />);

        expect(screen.getByRole('heading', { name: 'Boy or Girl?' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'she' }));

        await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ guess: 'SHE', answers: [] }));
        expect(push).not.toHaveBeenCalled();
    });

    it('opens the page after the guess when the host added extra questions', async () => {
        current = view({ questions: [weight] });
        render(<HeOrShePromptCard eventId="e1" eventType={null} enabled />);

        fireEvent.click(screen.getByRole('button', { name: 'he' }));

        await vi.waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/tools/he-or-she')));
    });

    it('counts down to the reveal when there is a reveal time', () => {
        current = view({ revealAt: new Date(Date.now() + 2 * 86_400_000).toISOString() });
        render(<HeOrShePromptCard eventId="e1" eventType={null} enabled />);

        expect(screen.getByRole('timer')).toBeTruthy();
    });

    it('shows no countdown when the host reveals by hand', () => {
        render(<HeOrShePromptCard eventId="e1" eventType={null} enabled />);

        expect(screen.queryByRole('timer')).toBeNull();
    });

    it.each([
        ['already guessed', () => (current = view({ myGuess: 'HE' }))],
        ['guessing is closed', () => (current = view({ canGuess: false }))],
        ['revealed', () => (current = view({ status: 'REVEALED', result: 'SHE', canGuess: false }))],
        ['a demo visitor', () => (accessMode = 'demoVisitor')],
    ])('renders nothing when %s', (_, arrange) => {
        arrange();
        const { container } = render(<HeOrShePromptCard eventId="e1" eventType={null} enabled />);
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when the module is off', () => {
        const { container } = render(<HeOrShePromptCard eventId="e1" eventType={null} enabled={false} />);
        expect(container.firstChild).toBeNull();
    });
});
