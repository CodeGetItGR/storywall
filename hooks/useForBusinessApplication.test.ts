import { act, renderHook } from '@testing-library/react';
import type { SubmitEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useForBusinessApplication } from '@/hooks/useForBusinessApplication';
import { ApiError } from '@/lib/api/client';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api/client')>();
    return { ...actual, api: { ...actual.api, post: (...args: unknown[]) => post(...args) } };
});
vi.mock('next-intl', () => ({ useLocale: () => 'en' }));

function submitEvent(): SubmitEvent<HTMLFormElement> {
    const form = document.createElement('form');
    for (const [name, value] of Object.entries({ name: 'Ann', businessName: 'Ann Events', role: 'PLANNER', email: 'ann@x.com', link: '@ann', countryCode: 'US', website: '' })) {
        const input = document.createElement('input');
        input.name = name;
        input.value = value;
        form.appendChild(input);
    }
    return { preventDefault: () => {}, currentTarget: form } as unknown as SubmitEvent<HTMLFormElement>;
}

beforeEach(() => {
    post.mockReset();
});

describe('useForBusinessApplication', () => {
    it('posts the application and ends in the sent state', async () => {
        post.mockResolvedValue({ id: 'a1' });
        const { result } = renderHook(() => useForBusinessApplication());
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(post).toHaveBeenCalledWith('/api/public/partner-applications', expect.objectContaining({ email: 'ann@x.com', locale: 'en' }));
        expect(result.current.isSent).toBe(true);
    });

    it('keeps the form and shows "exists" on 409', async () => {
        post.mockRejectedValue(new ApiError(409, null));
        const { result } = renderHook(() => useForBusinessApplication());
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.isSent).toBe(false);
        expect(result.current.error).toBe('exists');
    });
});
