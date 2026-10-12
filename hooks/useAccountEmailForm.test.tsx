import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAccountEmailForm } from '@/hooks/useAccountEmailForm';
import type { AdminEmailRequestDto, UserResponseDto } from '@/lib/api/types';

const AVAILABLE_TEMPLATES = [
    { key: 'PASSWORD_RESET', available: true, unavailableReason: null },
    { key: 'PROVISIONED_HOST_WELCOME', available: true, unavailableReason: null },
    { key: 'EMAIL_VERIFICATION', available: false, unavailableReason: 'ALREADY_VERIFIED' },
    { key: 'CUSTOM', available: true, unavailableReason: null },
];

const mocks = vi.hoisted(() => ({
    sent: [] as AdminEmailRequestDto[],
    previewRequests: [] as (AdminEmailRequestDto | null)[],
    templates: [] as { key: string; available: boolean; unavailableReason: string | null }[],
    resets: 0,
    events: { data: undefined as unknown, isLoading: false, error: null as unknown },
}));

vi.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: <T,>(value: T) => value }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useAdminEvents', () => ({ useAdminEvents: () => mocks.events }));
vi.mock('@/hooks/useAdminEmails', () => ({
    useAdminEmailTemplates: () => ({ data: mocks.templates, isLoading: false }),
    // Like keepPreviousData: the last email stays in `data` even once the request is gone.
    useAdminEmailPreview: (_userId: string, request: AdminEmailRequestDto | null) => {
        mocks.previewRequests.push(request);
        return { data: { to: 'host@example.com', subject: 's', html: '', text: '' }, isFetching: false, error: null };
    },
    useSendAdminEmailMutation: () => ({
        mutateAsync: async (request: AdminEmailRequestDto) => {
            mocks.sent.push(request);
        },
        isPending: false,
        error: null,
        reset: () => {
            mocks.resets += 1;
        },
    }),
}));

const ACCOUNT = { id: 'user-1', email: 'host@example.com', locale: 'el' } as UserResponseDto;

describe('useAccountEmailForm', () => {
    beforeEach(() => {
        mocks.sent.length = 0;
        mocks.previewRequests.length = 0;
        mocks.templates = AVAILABLE_TEMPLATES;
        mocks.resets = 0;
        mocks.events = {
            data: { content: [{ id: 'event-1', title: 'Party', startAt: '2027-06-01T15:00:00Z' }] },
            isLoading: false,
            error: null,
        };
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

    it('shows no preview once the request is gone, even if the last one is still cached', () => {
        const { result } = renderHook(() => useAccountEmailForm(ACCOUNT));
        expect(result.current.preview).not.toBeNull();
        act(() => result.current.changeTemplate('CUSTOM'));
        expect(result.current.preview).toBeNull();
        expect(result.current.isPreviewLoading).toBe(false);
    });

    it('keeps the picked template when it becomes unavailable, and blocks sending', () => {
        const { result, rerender } = renderHook(() => useAccountEmailForm(ACCOUNT));
        act(() => result.current.changeTemplate('PASSWORD_RESET'));
        expect(result.current.canSend).toBe(true);
        mocks.templates = AVAILABLE_TEMPLATES.map((item) =>
            item.key === 'PASSWORD_RESET' ? { ...item, available: false, unavailableReason: 'NOT_ACTIVE' } : item,
        );
        rerender();
        expect(result.current.template).toBe('PASSWORD_RESET');
        expect(result.current.isTemplateAvailable).toBe(false);
        expect(result.current.canSend).toBe(false);
        expect(mocks.previewRequests.at(-1)).toBeNull();
    });

    it('clears a send error when an input changes', () => {
        const { result } = renderHook(() => useAccountEmailForm(ACCOUNT));
        act(() => result.current.changeTemplate('CUSTOM'));
        const before = mocks.resets;
        act(() => result.current.setSubject('Hello'));
        expect(mocks.resets).toBe(before + 1);
        act(() => result.current.setLocale('en'));
        expect(mocks.resets).toBe(before + 2);
    });

    it('reports the hosted events loading and failing', () => {
        mocks.events = { data: undefined, isLoading: true, error: null };
        const { result, rerender } = renderHook(() => useAccountEmailForm(ACCOUNT));
        expect(result.current.isEventsLoading).toBe(true);
        expect(result.current.eventsError).toBeNull();
        mocks.events = { data: undefined, isLoading: false, error: new Error('down') };
        rerender();
        expect(result.current.isEventsLoading).toBe(false);
        expect(result.current.eventsError).toBe('error');
    });
});
