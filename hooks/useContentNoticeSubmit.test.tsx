import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useContentNoticeSubmit } from '@/hooks/useContentNoticeSubmit';
import { ApiError } from '@/lib/api/client';

const mocks = vi.hoisted(() => ({ publicPost: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { publicPost: (...args: unknown[]) => mocks.publicPost(...args) },
}));
vi.mock('next-intl', () => ({ useLocale: () => 'el' }));

type Hook = ReturnType<typeof useContentNoticeSubmit>;

function fillValid(result: { current: Hook }, overrides: { category?: 'COPYRIGHT' | 'CHILD_SEXUAL_ABUSE'; identity?: boolean } = {}) {
    act(() => {
        result.current.setField('category', overrides.category ?? 'COPYRIGHT');
        result.current.setField('locationText', '  The photo at the wedding  ');
        result.current.setField('explanation', 'It is my photograph.');
        if (overrides.identity !== false) {
            result.current.setField('notifierName', 'Eleni');
            result.current.setField('notifierEmail', 'e@example.com');
        }
        result.current.setField('goodFaith', true);
    });
}

describe('useContentNoticeSubmit', () => {
    beforeEach(() => mocks.publicPost.mockReset());

    it('sends a trimmed body with the page locale and an empty honeypot', async () => {
        mocks.publicPost.mockResolvedValue({ reference: 'AB12CD34' });
        const { result } = renderHook(() => useContentNoticeSubmit());
        fillValid(result);
        await act(() => result.current.submit());
        expect(mocks.publicPost).toHaveBeenCalledWith(
            '/api/content-notices',
            expect.objectContaining({
                category: 'COPYRIGHT',
                locationText: 'The photo at the wedding',
                link: null,
                website: '',
                locale: 'el',
                goodFaith: true,
            }),
        );
        expect(result.current.reference).toBe('AB12CD34');
    });

    it('sends a trimmed link and omits blank identity for child sexual abuse', async () => {
        mocks.publicPost.mockResolvedValue({ reference: 'AB12CD34' });
        const { result } = renderHook(() => useContentNoticeSubmit());
        fillValid(result, { category: 'CHILD_SEXUAL_ABUSE', identity: false });
        act(() => result.current.setField('link', '  HTTPS://example.com/x  '));
        await act(() => result.current.submit());
        expect(mocks.publicPost).toHaveBeenCalledWith(
            '/api/content-notices',
            expect.objectContaining({ link: 'HTTPS://example.com/x', notifierName: null, notifierEmail: null }),
        );
    });

    it('does not submit without name and email unless the category is child sexual abuse', async () => {
        const { result } = renderHook(() => useContentNoticeSubmit());
        fillValid(result, { identity: false });
        expect(result.current.canSubmit).toBe(false);
        await act(() => result.current.submit());
        expect(mocks.publicPost).not.toHaveBeenCalled();
        act(() => result.current.setField('category', 'CHILD_SEXUAL_ABUSE'));
        expect(result.current.canSubmit).toBe(true);
    });

    it('requires 10 characters after trimming and an http(s) link', () => {
        const { result } = renderHook(() => useContentNoticeSubmit());
        fillValid(result);
        act(() => result.current.setField('explanation', '   short   '));
        expect(result.current.canSubmit).toBe(false);
        act(() => result.current.setField('explanation', 'long enough text'));
        expect(result.current.canSubmit).toBe(true);
        act(() => result.current.setField('link', 'ftp://example.com'));
        expect(result.current.canSubmit).toBe(false);
    });

    it('maps 429 to rateLimited', async () => {
        mocks.publicPost.mockRejectedValueOnce(new ApiError(429, { errorCode: 3010 }));
        const { result } = renderHook(() => useContentNoticeSubmit());
        fillValid(result);
        await act(() => result.current.submit());
        expect(result.current.error).toBe('rateLimited');
    });

    it('maps 400/3001 with an errors map onto the fields', async () => {
        mocks.publicPost.mockRejectedValueOnce(
            new ApiError(400, { errorCode: 3001, errors: { notifierEmail: 'must be a valid email', website: 'x' } }),
        );
        const { result } = renderHook(() => useContentNoticeSubmit());
        fillValid(result);
        await act(() => result.current.submit());
        expect(result.current.error).toBe('fieldErrors');
        expect(result.current.fieldErrors).toEqual({ notifierEmail: 'must be a valid email' });
        act(() => result.current.setField('notifierEmail', 'f@example.com'));
        expect(result.current.fieldErrors.notifierEmail).toBeUndefined();
    });

    it('shows a form-level message for 400/3001 without a map, and a generic one for 3002', async () => {
        mocks.publicPost.mockRejectedValueOnce(new ApiError(400, { errorCode: 3001 }));
        const { result } = renderHook(() => useContentNoticeSubmit());
        fillValid(result);
        await act(() => result.current.submit());
        expect(result.current.error).toBe('invalid');
        mocks.publicPost.mockRejectedValueOnce(new ApiError(400, { errorCode: 3002 }));
        await act(() => result.current.submit());
        expect(result.current.error).toBe('failed');
    });
});
