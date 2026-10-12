import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAccountEmailForm } from '@/hooks/useAccountEmailForm';
import type { AdminEmailRequestDto, UserResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({ sent: [] as AdminEmailRequestDto[], previewRequests: [] as (AdminEmailRequestDto | null)[] }));

vi.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: <T,>(value: T) => value }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useAdminEvents', () => ({
    useAdminEvents: () => ({ data: { content: [{ id: 'event-1', title: 'Party', startAt: '2027-06-01T15:00:00Z' }] }, isLoading: false }),
}));
vi.mock('@/hooks/useAdminEmails', () => ({
    useAdminEmailTemplates: () => ({
        data: [
            { key: 'PASSWORD_RESET', available: true, unavailableReason: null },
            { key: 'PROVISIONED_HOST_WELCOME', available: true, unavailableReason: null },
            { key: 'EMAIL_VERIFICATION', available: false, unavailableReason: 'ALREADY_VERIFIED' },
            { key: 'CUSTOM', available: true, unavailableReason: null },
        ],
        isLoading: false,
    }),
    useAdminEmailPreview: (_userId: string, request: AdminEmailRequestDto | null) => {
        mocks.previewRequests.push(request);
        return { data: undefined, isFetching: false, error: null };
    },
    useSendAdminEmailMutation: () => ({
        mutateAsync: async (request: AdminEmailRequestDto) => {
            mocks.sent.push(request);
        },
        isPending: false,
        error: null,
        reset: () => undefined,
    }),
}));

const ACCOUNT = { id: 'user-1', email: 'host@example.com', locale: 'el' } as UserResponseDto;

describe('useAccountEmailForm', () => {
    beforeEach(() => {
        mocks.sent.length = 0;
        mocks.previewRequests.length = 0;
    });

    it('starts on the first available template in the account language', () => {
        const { result } = renderHook(() => useAccountEmailForm(ACCOUNT));
        expect(result.current.template).toBe('PROVISIONED_HOST_WELCOME');
        expect(result.current.locale).toBe('el');
        // The first hosted event is preselected, so the welcome preview loads at once.
        expect(result.current.request).toEqual({ template: 'PROVISIONED_HOST_WELCOME', locale: 'el', eventId: 'event-1' });
    });

    it('ignores an unavailable template', () => {
        const { result } = renderHook(() => useAccountEmailForm(ACCOUNT));
        act(() => result.current.changeTemplate('EMAIL_VERIFICATION'));
        expect(result.current.template).toBe('PROVISIONED_HOST_WELCOME');
    });

    it('builds a custom request from the typed text', () => {
        const { result } = renderHook(() => useAccountEmailForm(ACCOUNT));
        act(() => result.current.changeTemplate('CUSTOM'));
        expect(result.current.request).toBeNull();
        act(() => result.current.setSubject('Hello'));
        act(() => result.current.setBody('Text'));
        expect(result.current.request).toEqual({ template: 'CUSTOM', locale: 'el', subject: 'Hello', body: 'Text' });
    });

    it('sends the current request after confirmation and shows the sent state', async () => {
        const { result } = renderHook(() => useAccountEmailForm(ACCOUNT));
        act(() => result.current.changeTemplate('PASSWORD_RESET'));
        act(() => result.current.requestSend());
        expect(result.current.confirmOpen).toBe(true);
        await act(() => result.current.confirmSend());
        expect(mocks.sent).toEqual([{ template: 'PASSWORD_RESET', locale: 'el' }]);
        expect(result.current.sent).toBe(true);
    });
});
