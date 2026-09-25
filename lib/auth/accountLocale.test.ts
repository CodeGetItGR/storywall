// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { localeCookieName } from '@/i18n/config';

import { restoreAccountLocale } from './accountLocale';

type CookieStore = Parameters<typeof restoreAccountLocale>[0];

function cookieStore(locale?: string) {
    const values = new Map<string, string>(locale ? [[localeCookieName, locale]] : []);
    const set = vi.fn((name: string, value: string) => values.set(name, value));
    const store = { get: (name: string) => (values.has(name) ? { name, value: values.get(name) } : undefined), set } as unknown as CookieStore;
    return { store, set };
}

function mockAccountLocale(locale: string | null, ok = true) {
    const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => ({ locale }) });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('restoreAccountLocale', () => {
    it('saves a non-default account language on a device with no saved choice', async () => {
        const fetchMock = mockAccountLocale('el');
        const { store, set } = cookieStore();
        await restoreAccountLocale(store, 'at', 'en');
        expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer at');
        expect(set).toHaveBeenCalledWith(localeCookieName, 'el', expect.objectContaining({ path: '/' }));
    });

    it('ignores the default account language so the browser language stays in charge', async () => {
        mockAccountLocale('en');
        const { store, set } = cookieStore();
        await restoreAccountLocale(store, 'at', 'el');
        expect(set).not.toHaveBeenCalled();
    });

    it("keeps this device's saved choice without asking Spring", async () => {
        const fetchMock = mockAccountLocale('el');
        const { store, set } = cookieStore('en');
        await restoreAccountLocale(store, 'at', 'en');
        expect(fetchMock).not.toHaveBeenCalled();
        expect(set).not.toHaveBeenCalled();
    });

    it('treats an unsupported cookie value as no saved choice', async () => {
        mockAccountLocale('el');
        const { store, set } = cookieStore('fr');
        await restoreAccountLocale(store, 'at', 'en');
        expect(set).toHaveBeenCalledWith(localeCookieName, 'el', expect.anything());
    });

    it('does nothing when Spring fails', async () => {
        mockAccountLocale('el', false);
        const { store, set } = cookieStore();
        await restoreAccountLocale(store, 'at', 'en');
        expect(set).not.toHaveBeenCalled();

        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
        await expect(restoreAccountLocale(store, 'at', 'en')).resolves.toBeUndefined();
        expect(set).not.toHaveBeenCalled();
    });
});
