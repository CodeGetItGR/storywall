import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import React from 'react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { meQueryKey } from '@/hooks/useMe';
import { useProfilePictureUpload } from '@/hooks/useProfilePictureUpload';
import type { UserResponseDto } from '@/lib/api/types';

const updateProfile = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' }, updateProfile }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'Upload failed' }));

const apiPostForm = vi.fn();
vi.mock('@/lib/api/client', () => ({
    api: { postForm: (...a: unknown[]) => apiPostForm(...a) },
    ApiError: class ApiError extends Error {},
}));

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeAll(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
});

afterAll(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
});

beforeEach(() => {
    apiPostForm.mockReset();
    updateProfile.mockReset();
});

function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    client.setQueryData(meQueryKey, { id: 'u1', profilePictureUrl: 'https://cdn/old.jpg' } as UserResponseDto);
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const hook = renderHook(() => useProfilePictureUpload(), { wrapper });
    return { client, hook };
}

function pick(file: File) {
    const target = { files: [file], value: 'C:\\fakepath\\photo.png' };
    return { event: { target } as unknown as ChangeEvent<HTMLInputElement>, target };
}

describe('useProfilePictureUpload', () => {
    it('opens a preview on pick without uploading', () => {
        const { hook } = setup();
        const { event, target } = pick(new File(['x'], 'photo.png', { type: 'image/png' }));

        act(() => hook.result.current.handleFileChange(event));

        expect(apiPostForm).not.toHaveBeenCalled();
        expect(hook.result.current.isOpen).toBe(true);
        expect(hook.result.current.previewUrl).toBe('blob:preview');
        // Cleared so picking the same file again fires another change event.
        expect(target.value).toBe('');
    });

    it('writes the uploaded picture into the /api/me cache on confirm', async () => {
        const { client, hook } = setup();
        const updated = { id: 'u1', profilePictureUrl: 'https://cdn/new.jpg' } as UserResponseDto;
        apiPostForm.mockResolvedValue(updated);

        act(() => hook.result.current.handleFileChange(pick(new File(['x'], 'photo.png')).event));
        act(() => hook.result.current.confirm());

        await waitFor(() => expect(hook.result.current.isUpdated).toBe(true));
        expect(apiPostForm).toHaveBeenCalledTimes(1);
        expect(client.getQueryData<UserResponseDto>(meQueryKey)?.profilePictureUrl).toBe('https://cdn/new.jpg');
        expect(updateProfile).toHaveBeenCalledWith(updated);
        expect(hook.result.current.isOpen).toBe(false);
    });

    it('keeps the dialog open with an error when the upload fails, and allows a retry', async () => {
        const { hook } = setup();
        apiPostForm.mockRejectedValueOnce(new Error('boom'));

        act(() => hook.result.current.handleFileChange(pick(new File(['x'], 'photo.png')).event));
        act(() => hook.result.current.confirm());

        await waitFor(() => expect(hook.result.current.error).toBe('Upload failed'));
        expect(hook.result.current.isOpen).toBe(true);
        expect(hook.result.current.isUploading).toBe(false);

        apiPostForm.mockResolvedValueOnce({ id: 'u1', profilePictureUrl: 'https://cdn/new.jpg' });
        act(() => hook.result.current.confirm());

        await waitFor(() => expect(hook.result.current.isUpdated).toBe(true));
        expect(hook.result.current.error).toBeNull();
        expect(apiPostForm).toHaveBeenCalledTimes(2);
    });

    it('discards the selection on cancel', () => {
        const { hook } = setup();

        act(() => hook.result.current.handleFileChange(pick(new File(['x'], 'photo.png')).event));
        act(() => hook.result.current.cancel());

        expect(hook.result.current.isOpen).toBe(false);
        expect(apiPostForm).not.toHaveBeenCalled();
    });
});
