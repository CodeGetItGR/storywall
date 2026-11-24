import { describe, expect, it } from 'vitest';

import type { HeOrSheViewDto } from '@/lib/api/types';
import { heOrSheFeedView } from '@/lib/feedHeOrShe';

const view = (patch: Partial<HeOrSheViewDto>): HeOrSheViewDto => ({
    status: 'OPEN',
    closesAt: '2026-12-19T20:00:00Z',
    canGuess: true,
    myGuess: null,
    tally: null,
    questions: [],
    myAnswers: {},
    ...patch,
});

describe('heOrSheFeedView', () => {
    it("asks a member who can guess and hasn't", () => {
        expect(heOrSheFeedView(view({}))).toEqual({ kind: 'guess' });
    });

    it('keeps the guess on show while voting is open, without the tally', () => {
        expect(heOrSheFeedView(view({ myGuess: 'SHE', tally: { he: 2, she: 3 } }))).toEqual({ kind: 'guessed', guess: 'SHE' });
    });

    it('shows the tally to a host while voting is open, guessed or not', () => {
        const tally = { he: 2, she: 3 };
        expect(heOrSheFeedView(view({ tally }), true)).toEqual({ kind: 'tally', tally });
        expect(heOrSheFeedView(view({ canGuess: false, tally }), true)).toEqual({ kind: 'tally', tally });
        expect(heOrSheFeedView(view({ myGuess: 'HE', tally }), true)).toEqual({ kind: 'tally', tally });
    });

    it('shows the result once voting closes, with the guess when there was one', () => {
        const tally = { he: 4, she: 1 };
        expect(heOrSheFeedView(view({ status: 'CLOSED', myGuess: 'HE', tally }))).toEqual({ kind: 'closed', guess: 'HE', tally });
        expect(heOrSheFeedView(view({ status: 'CLOSED', tally }))).toEqual({ kind: 'closed', guess: null, tally });
        expect(heOrSheFeedView(view({ status: 'CLOSED', tally }), true)).toEqual({ kind: 'closed', guess: null, tally });
    });

    it("has nothing to show without a view, or to a member who can't guess and gets no tally", () => {
        expect(heOrSheFeedView(undefined)).toBeNull();
        expect(heOrSheFeedView(view({ canGuess: false }))).toBeNull();
    });
});
