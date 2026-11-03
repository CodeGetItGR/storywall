import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShopPagination } from '@/components/shop/ShopPagination';

vi.mock('next-intl/server', () => ({
    getTranslations: async () => (key: string) => key,
}));

describe('ShopPagination', () => {
    afterEach(cleanup);

    it('keeps the category in page links', async () => {
        render(await ShopPagination({ locale: 'el', category: 'weddings', page: 1, totalPages: 3 }));

        expect(screen.getByRole('link', { name: 'previous' })).toHaveAttribute('href', '/el/shop?category=weddings');
        expect(screen.getByRole('link', { name: 'next' })).toHaveAttribute('href', '/el/shop?category=weddings&page=2');
    });

    it('has no previous link on the first page and no next link on the last', async () => {
        const { rerender } = render(await ShopPagination({ locale: 'en', page: 0, totalPages: 2 }));
        expect(screen.queryByRole('link', { name: 'previous' })).not.toBeInTheDocument();

        rerender(await ShopPagination({ locale: 'en', page: 1, totalPages: 2 }));
        expect(screen.queryByRole('link', { name: 'next' })).not.toBeInTheDocument();
    });

    it('hides itself for one page', async () => {
        const { container } = render(await ShopPagination({ locale: 'el', page: 0, totalPages: 1 }));

        expect(container).toBeEmptyDOMElement();
    });
});
