import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    gift: { data: undefined as unknown, isLoading: false },
    issued: { data: undefined as unknown },
    templates: { data: undefined as unknown, isLoading: false, isError: false, refetch: vi.fn() },
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
}));
vi.mock('@/hooks/useGift', () => ({ useEventGift: () => mocks.gift, useIssuedGiftCard: () => mocks.issued }));
vi.mock('@/hooks/useQrCardTemplates', () => ({ useQrCardTemplates: () => mocks.templates }));
vi.mock('@/lib/gift', () => ({ canPrintGiftCard: () => true, giftClaimUrl: (origin: string, token: string) => `${origin}/gift/${token}` }));

import { useGiftCardPrint } from '@/hooks/useGiftCardPrint';

const CARD = {
    token: 'tok',
    status: 'ISSUED',
    recipientLabel: 'For Eleni',
    recipientEmail: 'eleni@example.com',
    giverDisplayName: 'The Papadopoulos family',
};

function unticked() {
    return { target: { checked: false } } as unknown as ChangeEvent<HTMLInputElement>;
}

beforeEach(() => {
    mocks.gift = { data: CARD, isLoading: false };
    mocks.issued = { data: { token: 'tok', pin: '4821' } };
    mocks.templates = { data: { available: true, templates: [] }, isLoading: false, isError: false, refetch: vi.fn() };
});

describe('useGiftCardPrint', () => {
    it('waits for the designs too', () => {
        mocks.templates = { ...mocks.templates, data: undefined, isLoading: true };
        expect(renderHook(() => useGiftCardPrint('e1')).result.current.isLoading).toBe(true);
    });

    it('offers the designer only when the event has QR cards', () => {
        expect(renderHook(() => useGiftCardPrint('e1')).result.current.designsAvailable).toBe(true);
        mocks.templates = { ...mocks.templates, data: { available: false, templates: [] } };
        expect(renderHook(() => useGiftCardPrint('e1')).result.current.designsAvailable).toBe(false);
    });

    it('starts the designer from the card', () => {
        const { result } = renderHook(() => useGiftCardPrint('e1'));
        expect(result.current.designer.text).toEqual({ title: 'For Eleni', line: 'scan', giver: 'The Papadopoulos family' });
        expect(result.current.cardLabel).toBe('cardLabel {"title":"For Eleni"}');
        expect(result.current.claimUrl).toMatch(/\/gift\/tok$/);
    });

    it('stacks the scan line, PIN, email and giver under the code', () => {
        const { result } = renderHook(() => useGiftCardPrint('e1'));
        expect(result.current.cardLines).toEqual([
            { text: 'scan', tone: 'body' },
            { text: 'pin {"pin":"4821"}', tone: 'code' },
            { text: 'email {"email":"eleni@example.com"}', tone: 'small' },
            { text: 'The Papadopoulos family', tone: 'strong' },
        ]);
    });

    it('drops the PIN when the giver keeps it for the envelope', () => {
        const { result } = renderHook(() => useGiftCardPrint('e1'));
        act(() => result.current.handleIncludePinChange(unticked()));
        expect(result.current.cardLines.map((line) => line.tone)).toEqual(['body', 'small', 'strong']);
    });
});
