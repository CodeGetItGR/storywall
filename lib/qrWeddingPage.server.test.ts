// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const serverPublicConfigGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/serverFetch', () => ({ serverPublicConfigGet: (...args: unknown[]) => serverPublicConfigGet(...args) }));

import { endpoints } from '@/lib/api/endpoints';
import { loadQrWeddingPageLive } from '@/lib/qrWeddingPage.server';

describe('loadQrWeddingPageLive', () => {
    afterEach(() => {
        serverPublicConfigGet.mockReset();
    });

    it('reads the wedding switch from the config', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: false }] });
        await expect(loadQrWeddingPageLive('el')).resolves.toBe(false);
        expect(serverPublicConfigGet).toHaveBeenCalledWith(endpoints.config.get, 'el');
    });

    it('stays live when the config cannot be read', async () => {
        serverPublicConfigGet.mockRejectedValue(new Error('down'));
        await expect(loadQrWeddingPageLive()).resolves.toBe(true);
    });
});
