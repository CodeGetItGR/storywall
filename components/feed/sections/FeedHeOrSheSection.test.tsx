import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedHeOrSheSection } from '@/components/feed/sections/FeedHeOrSheSection';
import type { EventDetailResponseDto } from '@/lib/api/types';
import type { HeOrSheFeedView } from '@/lib/feedHeOrShe';
import en from '@/messages/en.json';

const prompt = vi.hoisted(() => ({
    view: null as HeOrSheFeedView | null,
    closesTime: null as number | null,
    calls: [] as [boolean, boolean][],
    guess: vi.fn(),
    isHost: false,
}));
vi.mock('@/hooks/useHeOrSheFeedPrompt', () => ({
    useHeOrSheFeedPrompt: (_eventId: string, enabled: boolean, isHost: boolean) => {
        prompt.calls.push([enabled, isHost]);
        const { view, closesTime, guess } = prompt;
        return { view, visible: view?.kind === 'guess', closesTime, isSending: false, error: null, guess };
    },
}));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => () => ({ name: 'Boy or Girl?' }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/providers/EventProvider', () => ({ useIsHost: () => prompt.isHost }));

afterEach(() => {
    cleanup();
    prompt.guess.mockReset();
    Object.assign(prompt, { view: null, closesTime: null, calls: [], isHost: false });
});

const inTwoDays = Date.now() + 2 * 86_400_000;

const event = (modules: string[]) =>
    ({ id: 'e-1', eventType: null, modules: modules.map((moduleKey) => ({ moduleKey, isAvailable: true })) }) as unknown as EventDetailResponseDto;

function renderSection(modules = ['he_or_she'], placeholder: ReactNode = null) {
    return render(
        <NextIntlClientProvider locale="en" messages={en}>
            <FeedHeOrSheSection event={event(modules)} placeholder={placeholder} />
        </NextIntlClientProvider>,
    );
}

describe('FeedHeOrSheSection', () => {
    it('asks before the member guesses', () => {
        prompt.view = { kind: 'guess' };
        renderSection();
        expect(screen.getByRole('heading', { name: 'Boy or Girl?' })).toBeTruthy();
        expect(screen.getByRole('group', { name: en.HeOrShePage.yourGuess })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: en.HeOrShePage.she }));
        expect(prompt.guess).toHaveBeenCalledWith('SHE');
    });

    it('stays after a guess and shows it with the countdown, without the tally', () => {
        prompt.view = { kind: 'guessed', guess: 'SHE' };
        prompt.closesTime = inTwoDays;
        renderSection();
        expect(screen.queryByRole('group', { name: en.HeOrShePage.yourGuess })).toBeNull();
        expect(screen.getByText(en.HeOrShePage.yourGuess)).toBeTruthy();
        expect(screen.getByText(en.HeOrShePage.she)).toBeTruthy();
        expect(screen.getByRole('timer')).toBeTruthy();
        expect(screen.queryByText(/%/)).toBeNull();
    });

    it('shows hosts the countdown and the tally', () => {
        prompt.isHost = true;
        prompt.view = { kind: 'tally', tally: { he: 3, she: 1 } };
        prompt.closesTime = inTwoDays;
        renderSection();
        expect(prompt.calls[0]).toEqual([true, true]);
        expect(screen.getByRole('timer')).toBeTruthy();
        expect(screen.getByText(/75%/)).toBeTruthy();
        expect(screen.queryByText(en.HeOrShePage.closed)).toBeNull();
    });

    it('shows the result once voting closes, without the countdown', () => {
        prompt.view = { kind: 'closed', guess: 'HE', tally: { he: 3, she: 1 } };
        prompt.closesTime = inTwoDays;
        renderSection();
        expect(screen.getByText(en.HeOrShePage.yourGuess)).toBeTruthy();
        expect(screen.getByText(en.HeOrShePage.closed)).toBeTruthy();
        expect(screen.getByText(/75%/)).toBeTruthy();
        expect(screen.queryByRole('timer')).toBeNull();
    });

    it('draws nothing to a member with nothing to see', () => {
        const { container } = renderSection();
        expect(container.textContent).toBe('');
    });

    it('draws the placeholder, and asks nothing, without the module', () => {
        renderSection([], <span>empty</span>);
        expect(screen.getByText('empty')).toBeTruthy();
        expect(prompt.calls.every(([enabled]) => !enabled)).toBe(true);
    });
});
