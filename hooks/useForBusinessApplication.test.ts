import { act, renderHook } from '@testing-library/react';
import type { SubmitEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useForBusinessApplication } from '@/hooks/useForBusinessApplication';
import { ApiError } from '@/lib/api/client';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api/client')>();
    return { ...actual, api: { ...actual.api, publicPost: (...args: unknown[]) => post(...args) } };
});
vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
const track = vi.hoisted(() => vi.fn());
vi.mock('@vercel/analytics', () => ({ track }));

function submitEvent(): SubmitEvent<HTMLFormElement> {
    const form = document.createElement('form');
    for (const [name, value] of Object.entries({
        name: 'Ann',
        businessName: 'Ann Events',
        role: 'PLANNER',
        email: 'ann@x.com',
        link: '@ann',
        countryCode: 'US',
        website: '',
    })) {
        const input = document.createElement('input');
        input.name = name;
        input.value = value;
        form.appendChild(input);
    }
    return { preventDefault: () => {}, currentTarget: form } as unknown as SubmitEvent<HTMLFormElement>;
}

beforeEach(() => {
    post.mockReset();
    track.mockClear();
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

    it('sends the given attribution instead of the address bar', async () => {
        window.history.replaceState(null, '', '/en/for-business?utm_source=google');
        post.mockResolvedValue({ id: 'a1' });
        const { result } = renderHook(() => useForBusinessApplication({ search: '?utm_source=storywall-vendor&utm_medium=MUSIC' }));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(post).toHaveBeenCalledWith(
            '/api/public/partner-applications',
            expect.objectContaining({ utmSource: 'storywall-vendor', utmMedium: 'MUSIC' }),
        );
    });

    it('still reads the address bar by default', async () => {
        window.history.replaceState(null, '', '/en/for-business?utm_source=google');
        post.mockResolvedValue({ id: 'a1' });
        const { result } = renderHook(() => useForBusinessApplication());
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(post).toHaveBeenCalledWith('/api/public/partner-applications', expect.objectContaining({ utmSource: 'google', utmMedium: null }));
    });

    it('counts a sent application for its public page', async () => {
        post.mockResolvedValue({ id: 'a1' });
        const { result } = renderHook(() => useForBusinessApplication({ source: 'PHOTOGRAPHER' }));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(track).toHaveBeenCalledExactlyOnceWith('Vendor Page Apply', { type: 'PHOTOGRAPHER', locale: 'en' });
    });

    it('counts nothing when the application fails or the form has no page', async () => {
        post.mockRejectedValueOnce(new ApiError(409, null));
        const { result } = renderHook(() => useForBusinessApplication({ source: 'all' }));
        await act(() => result.current.handleSubmit(submitEvent()));
        post.mockResolvedValue({ id: 'a1' });
        const sheet = renderHook(() => useForBusinessApplication({ search: '?utm_source=storywall-vendor' }));
        await act(() => sheet.result.current.handleSubmit(submitEvent()));
        expect(track).not.toHaveBeenCalled();
    });

    it('names an existing application (409) and the rate limit (429) from the vendor sheet', async () => {
        const { result } = renderHook(() => useForBusinessApplication({ search: '?utm_source=storywall-vendor&utm_medium=MUSIC' }));
        post.mockRejectedValueOnce(new ApiError(409, null));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.error).toBe('exists');
        post.mockRejectedValueOnce(new ApiError(429, null));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.error).toBe('rateLimited');
        expect(result.current.isSent).toBe(false);
    });
});
