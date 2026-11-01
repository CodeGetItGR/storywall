import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useBusinessContact } from '@/hooks/useBusinessContact';
import messages from '@/messages/en.json';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { post },
}));

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={new QueryClient()}>
            <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
                {children}
            </NextIntlClientProvider>
        </QueryClientProvider>
    );
}

describe('useBusinessContact', () => {
    it('asks for a topic and a message before sending', async () => {
        const { result } = renderHook(() => useBusinessContact(), { wrapper });
        act(() => result.current.openSheet());
        await act(() => result.current.submit());

        expect(post).not.toHaveBeenCalled();
        expect(result.current.topicError).toBe('Pick a topic.');
        expect(result.current.messageError).toBe('Write a message.');
    });

    it('sends the trimmed message and shows it was sent', async () => {
        post.mockResolvedValue({ id: 'm1', createdAt: '2026-11-01T10:00:00Z' });
        const { result } = renderHook(() => useBusinessContact(), { wrapper });
        act(() => {
            result.current.openSheet();
            result.current.setTopic('PROBLEM');
            result.current.setMessage('  Upload stops  ');
        });
        await act(() => result.current.submit());

        expect(post).toHaveBeenCalledWith('/api/me/business/messages', { topic: 'PROBLEM', message: 'Upload stops' });
        expect(result.current.sent).toBe(true);
    });
});
