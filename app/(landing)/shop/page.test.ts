// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/shop/ShopListScreen', () => ({ ShopListScreen: () => null }));
vi.mock('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
vi.mock('@/lib/shopRelease', () => ({ showsShop: vi.fn() }));

import LocalizedShopPage, { generateMetadata as localizedMetadata } from '@/app/(landing)/[slug]/shop/page';
import ShopPage, { generateMetadata } from '@/app/(landing)/shop/page';
import { showsShop } from '@/lib/shopRelease';

const noSearch = Promise.resolve({});

describe('shop pages', () => {
    beforeEach(() => {
        vi.mocked(showsShop).mockReturnValue(true);
    });

    it('404s while the shop is hidden', async () => {
        vi.mocked(showsShop).mockReturnValue(false);

        await expect(ShopPage({ searchParams: noSearch })).rejects.toMatchObject({ digest: expect.stringContaining('404') });
        await expect(LocalizedShopPage({ params: Promise.resolve({ slug: 'el' }), searchParams: noSearch })).rejects.toMatchObject({
            digest: expect.stringContaining('404'),
        });
    });

    it('is noindex', async () => {
        expect((await generateMetadata()).robots).toEqual({ index: false, follow: true });
        expect((await localizedMetadata({ params: Promise.resolve({ slug: 'el' }), searchParams: noSearch })).robots).toEqual({ index: false, follow: true });
    });

    it('has no shop under any other language prefix', async () => {
        await expect(LocalizedShopPage({ params: Promise.resolve({ slug: 'en' }), searchParams: noSearch })).rejects.toMatchObject({
            digest: expect.stringContaining('404'),
        });
    });
});
