import { describe, expect, it } from 'vitest';

import { endpoints } from '@/lib/api/endpoints';
import { getApiErrorMessageKey } from '@/lib/api/errorMessageKeys';
import { ERROR_CODES } from '@/lib/api/errors';

describe('shop endpoints', () => {
    it('builds public and admin shop paths', () => {
        expect(endpoints.shop.products({ category: 'wedding-invitations', page: 2 })).toBe('/api/shop/products?category=wedding-invitations&page=2');
        expect(endpoints.shop.products({ page: 0 })).toBe('/api/shop/products?page=0');
        expect(endpoints.shop.product('inviart', 'hlektroniko-prosklitirio')).toBe('/api/shop/products/inviart/hlektroniko-prosklitirio');
        expect(endpoints.shop.product('inviart', 'ιστοσελίδα-γάμου-1')).toBe(`/api/shop/products/inviart/${encodeURIComponent('ιστοσελίδα-γάμου-1')}`);
        expect(endpoints.admin.shop.storeCollections('id-1')).toBe('/api/admin/shop/stores/id-1/collections');
        expect(endpoints.admin.shop.categoryCollections('c-1')).toBe('/api/admin/shop/categories/c-1/collections');
    });

    it('maps the shop error codes to message keys', () => {
        expect(ERROR_CODES.SHOP_STORE_DOMAIN_TAKEN).toBe(5204);
        expect(ERROR_CODES.SHOP_SLUG_TAKEN).toBe(5205);
        expect(ERROR_CODES.SHOP_CREDENTIALS_INVALID).toBe(5206);
        expect(getApiErrorMessageKey(ERROR_CODES.SHOP_STORE_DOMAIN_TAKEN)).toBe('shopStoreDomainTaken');
        expect(getApiErrorMessageKey(ERROR_CODES.SHOP_SLUG_TAKEN)).toBe('shopSlugTaken');
        expect(getApiErrorMessageKey(ERROR_CODES.SHOP_CREDENTIALS_INVALID)).toBe('shopCredentialsInvalid');
    });
});
