import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { sendUploadWithBusyRetry, uploadBusyDelayMs } from '@/lib/api/uploadRetry';

function busy(retryAfterSeconds: number) {
    return new ApiError(503, { errorCode: 3017, retryAfterSeconds });
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('uploadBusyDelayMs', () => {
    it('waits the advised seconds plus up to a fifth of jitter', () => {
        expect(uploadBusyDelayMs(busy(10), () => 0)).toBe(10_000);
        expect(uploadBusyDelayMs(busy(10), () => 1)).toBe(12_000);
    });

    it('never waits more than a minute', () => {
        expect(uploadBusyDelayMs(busy(600), () => 0)).toBe(60_000);
    });

    it('reads the Retry-After header when the body has no wait', () => {
        expect(uploadBusyDelayMs(new ApiError(503, null, undefined, '5'), () => 0)).toBe(5_000);
    });

    it('is null for anything but a 503 with a wait', () => {
        expect(uploadBusyDelayMs(new ApiError(503, null))).toBeNull();
        expect(uploadBusyDelayMs(new ApiError(429, { errorCode: 3010, retryAfterSeconds: 5 }))).toBeNull();
        expect(uploadBusyDelayMs(new ApiError(413, { errorCode: 3005 }))).toBeNull();
    });
});

describe('sendUploadWithBusyRetry', () => {
    it('resends after the advised wait and reports the wait', async () => {
        const send = vi.fn().mockRejectedValueOnce(busy(10)).mockResolvedValueOnce('done');
        const onBusy = vi.fn();

        const promise = sendUploadWithBusyRetry(send, { onBusy });
        await vi.advanceTimersByTimeAsync(0);
        expect(onBusy).toHaveBeenLastCalledWith(true);
        expect(send).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(12_000);
        await expect(promise).resolves.toBe('done');
        expect(send).toHaveBeenCalledTimes(2);
        expect(onBusy).toHaveBeenLastCalledWith(false);
    });

    it('gives up after three resends and throws the last refusal', async () => {
        const refusal = busy(1);
        const send = vi.fn().mockRejectedValue(refusal);

        const promise = sendUploadWithBusyRetry(send);
        const outcome = expect(promise).rejects.toBe(refusal);
        await vi.advanceTimersByTimeAsync(10_000);
        await outcome;
        expect(send).toHaveBeenCalledTimes(4);
    });

    it('resends after a dropped connection, at most twice', async () => {
        const dropped = new TypeError('Failed to fetch');
        const send = vi.fn().mockRejectedValue(dropped);

        const promise = sendUploadWithBusyRetry(send);
        const outcome = expect(promise).rejects.toBe(dropped);
        await vi.advanceTimersByTimeAsync(10_000);
        await outcome;
        expect(send).toHaveBeenCalledTimes(3);
    });

    it('throws any other refusal at once', async () => {
        const refusal = new ApiError(413, { errorCode: 3005 });
        const send = vi.fn().mockRejectedValue(refusal);

        await expect(sendUploadWithBusyRetry(send)).rejects.toBe(refusal);
        expect(send).toHaveBeenCalledTimes(1);
    });

    it('stops waiting when aborted', async () => {
        const controller = new AbortController();
        const send = vi.fn().mockRejectedValue(busy(30));

        const promise = sendUploadWithBusyRetry(send, { signal: controller.signal });
        const outcome = expect(promise).rejects.toBeDefined();
        await vi.advanceTimersByTimeAsync(0);
        controller.abort();
        await outcome;
        expect(send).toHaveBeenCalledTimes(1);
    });
});
