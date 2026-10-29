import { afterEach, describe, expect, it } from 'vitest';

import { devicePairingPayload } from '@/lib/adminDevices';

const original = process.env.NEXT_PUBLIC_API_BASE_URL;

afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = original;
});

describe('devicePairingPayload', () => {
    it('carries the version, the API address and the key', () => {
        process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test';

        expect(JSON.parse(devicePairingPayload('k123'))).toEqual({ v: 1, api: 'https://api.example.test', key: 'k123' });
    });
});
