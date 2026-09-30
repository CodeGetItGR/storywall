import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent, SubmitEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAccountEmailChange } from '@/hooks/useAccountEmailChange';
import { ApiError } from '@/lib/api/client';
import type { UserRequestDto, UserResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    calls: [] as { id: string; input: UserRequestDto }[],
    result: (): Promise<unknown> => Promise.resolve({}),
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({
    useApiErrorMessage: () => (error: unknown) => `api-${error instanceof ApiError ? error.status : 'unknown'}`,
}));
vi.mock('@/hooks/useAdminAccounts', () => ({
    useUpdateAdminAccountMutation: () => ({
        mutateAsync: (payload: { id: string; input: UserRequestDto }) => {
            mocks.calls.push(payload);
            return mocks.result();
        },
        isPending: false,
    }),
}));

const account = { id: 'user-1', email: 'old@example.com', emailVerified: true } as UserResponseDto;
const submitEvent = { preventDefault: () => {} } as SubmitEvent<HTMLFormElement>;
const typed = (value: string) => ({ target: { value } }) as ChangeEvent<HTMLInputElement>;

function renderChange(onChangedAction = (_account: UserResponseDto) => {}) {
    const { result } = renderHook(() => useAccountEmailChange({ account, onChangedAction }));
    act(() => result.current.start());
    return result;
}

describe('useAccountEmailChange', () => {
    beforeEach(() => {
        mocks.calls = [];
        mocks.result = () => Promise.resolve({});
    });

    it('saves a new email and hands back the updated account', async () => {
        const updated = { ...account, email: 'new@example.com', emailVerified: false };
        mocks.result = () => Promise.resolve(updated);
        const changed: UserResponseDto[] = [];
        const result = renderChange((next) => changed.push(next));

        act(() => result.current.handleChange(typed('New@example.com')));
        await act(() => result.current.submit(submitEvent));

        expect(mocks.calls).toEqual([{ id: 'user-1', input: { email: 'new@example.com' } }]);
        expect(changed).toEqual([updated]);
        expect(result.current.open).toBe(false);
    });

    it('cannot save the same email', () => {
        const result = renderChange();
        expect(result.current.canSave).toBe(false);
    });

    it('says the address is taken (409)', async () => {
        mocks.result = () => Promise.reject(new ApiError(409, { errorCode: 5002 }));
        const result = renderChange();

        act(() => result.current.handleChange(typed('taken@example.com')));
        await act(() => result.current.submit(submitEvent));

        expect(result.current.error).toBe('emailTaken');
        expect(result.current.open).toBe(true);
    });

    it('says the address is malformed (400)', async () => {
        mocks.result = () => Promise.reject(new ApiError(400, { errorCode: 3001 }));
        const result = renderChange();

        act(() => result.current.handleChange(typed('not-an-email')));
        await act(() => result.current.submit(submitEvent));

        expect(result.current.error).toBe('emailInvalid');
    });

    it('uses the shared message for other refusals', async () => {
        mocks.result = () => Promise.reject(new ApiError(403, {}));
        const result = renderChange();

        act(() => result.current.handleChange(typed('new@example.com')));
        await act(() => result.current.submit(submitEvent));

        expect(result.current.error).toBe('api-403');
    });
});
