import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGiftClaimCelebration } from '@/hooks/useGiftClaimCelebration';

const mocks = vi.hoisted(() => ({ confetti: vi.fn(), cardFor: vi.fn() }));

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string, values?: Record<string, string>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock('@/hooks/useCelebrationCard', () => ({
    useCelebrationCard: (eventId: string | null) => {
        mocks.cardFor(eventId);
        return null;
    },
}));
vi.mock('@/lib/celebrationConfetti', () => ({ fireCelebrationConfetti: mocks.confetti }));

describe('useGiftClaimCelebration', () => {
    beforeEach(() => {
        mocks.confetti.mockReset();
        mocks.cardFor.mockReset();
    });

    it('says the event is theirs and links to it', () => {
        const { result } = renderHook(() => useGiftClaimCelebration({ eventId: 'e1', status: 'COMPLETED', ownershipTransfersAt: null }));

        expect(result.current.heading).toBe('title');
        expect(result.current.line).toBe('completed');
        expect(result.current.feedHref).toContain('/events/e1');
        expect(result.current.inviteHref).toContain('/events/e1/manage/qr');
        expect(mocks.cardFor).toHaveBeenCalledWith('e1');
        expect(mocks.confetti).toHaveBeenCalledTimes(1);
    });

    it('gives the date ownership moves on', () => {
        const { result } = renderHook(() =>
            useGiftClaimCelebration({ eventId: 'e1', status: 'CLAIMED', ownershipTransfersAt: '2026-07-18T12:00:00Z' }),
        );

        expect(result.current.line).toMatch(/^claimed:.*July 18, 2026/);
    });

    it('says soon when there is no date yet', () => {
        const { result } = renderHook(() => useGiftClaimCelebration({ eventId: 'e1', status: 'CLAIMED', ownershipTransfersAt: null }));

        expect(result.current.line).toBe('claimedSoon');
    });
});
