// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/occasions/OccasionPage', () => ({ OccasionPage: () => null }));
vi.mock('@/lib/occasionMetadata', () => ({ getOccasionMetadata: vi.fn() }));

import LocalizedOccasionPage from '@/app/(landing)/[slug]/[occasion]/page';

function open(slug: string, occasion: string) {
    return LocalizedOccasionPage({ params: Promise.resolve({ slug, occasion }) });
}

describe('LocalizedOccasionPage', () => {
    it('sends /en/qr-code-for-wedding-photos to /qr-code-for-wedding-photos for good', async () => {
        await expect(open('en', 'qr-code-for-wedding-photos')).rejects.toMatchObject({ digest: expect.stringContaining(';/qr-code-for-wedding-photos;308;') });
    });

    it('has no wedding QR page under the Greek locale with the English slug', async () => {
        await expect(open('el', 'qr-code-for-wedding-photos')).rejects.toMatchObject({ digest: expect.stringContaining('404') });
    });
});
