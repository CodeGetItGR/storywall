import { act, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCampaignCountdown } from '@/hooks/useCampaignCountdown';
import messages from '@/messages/en.json';

const NOW = new Date('2026-11-03T10:00:00Z');

function wrapper({ children }: { children: ReactNode }) {
    return (
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            {children}
        </NextIntlClientProvider>
    );
}

function countdownUntil(endsAt: string) {
    return renderHook(() => useCampaignCountdown(endsAt), { wrapper }).result;
}

describe('useCampaignCountdown', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows days, hours and minutes when there are days left', () => {
        expect(countdownUntil('2026-11-05T15:12:30Z').current.endsIn).toBe('Ends in 2d 5h 12m.');
    });

    it('shows hours and minutes on the last day', () => {
        expect(countdownUntil('2026-11-03T15:12:30Z').current.endsIn).toBe('Ends in 5h 12m.');
    });

    it('shows minutes and seconds in the last hour', () => {
        expect(countdownUntil('2026-11-03T10:12:30Z').current.endsIn).toBe('Ends in 12m 30s.');
    });

    it('hides itself once it ends', () => {
        const result = countdownUntil('2026-11-03T10:00:02Z');
        expect(result.current.visible).toBe(true);

        act(() => {
            vi.advanceTimersByTime(2_000);
        });
        expect(result.current.visible).toBe(false);
    });
});
