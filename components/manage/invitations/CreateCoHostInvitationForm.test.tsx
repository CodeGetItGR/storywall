import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import { CreateCoHostInvitationForm } from './CreateCoHostInvitationForm';

let createError: unknown = null;
const request = vi.fn();

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, string>) => (values?.name ? `${key}:${values.name}` : key),
}));
vi.mock('@/hooks/useContentLimits', () => ({ useContentLimits: () => ({ emailMaxLength: 254, personNameMaxLength: 80 }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'generic error' }));
vi.mock('@/hooks/useEventInvitations', () => ({
    useCreateCoHostInvitation: () => ({ error: createError, isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks/usePromoteCoHost', () => ({
    usePromoteCoHost: () => ({ target: null, error: null, isPromoting: false, request, requestForMember: vi.fn(), close: vi.fn(), confirm: vi.fn() }),
}));
vi.mock('@/components/manage/members/PromoteCoHostModal', () => ({ PromoteCoHostModal: () => null }));
vi.mock('@/components/ui/DateTimeField', () => ({ DateTimeField: () => null }));

beforeEach(() => {
    createError = null;
    request.mockReset();
});
afterEach(cleanup);

describe('CreateCoHostInvitationForm', () => {
    it('offers to promote the member when the address already belongs to one (5161)', () => {
        createError = new ApiError(409, {
            status: 409,
            errorCode: 5161,
            details: { memberId: 'm1', userId: 'u1', displayName: 'Panagiotis' },
        });
        render(<CreateCoHostInvitationForm eventId="event-1" onDoneAction={vi.fn()} />);

        expect(screen.getByText('alreadyMember:Panagiotis')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'promote' }));
        expect(request).toHaveBeenCalledWith({ memberId: 'm1', userId: 'u1', displayName: 'Panagiotis' });
    });

    it('shows other errors as plain text with no promote action', () => {
        createError = new ApiError(409, { status: 409, errorCode: 5117 });
        render(<CreateCoHostInvitationForm eventId="event-1" onDoneAction={vi.fn()} />);

        expect(screen.getByText('generic error')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'promote' })).toBeNull();
    });
});
