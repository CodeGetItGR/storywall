import { ShopProductCard } from '@/components/shop/ShopProductCard';
import type { Locale } from '@/i18n/config';
import type { ShopProductCardDto } from '@/lib/api/types';

export function ShopProductGrid({ locale, products }: { locale: Locale; products: ShopProductCardDto[] }) {
    return (
        <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
                <li key={`${product.storeSlug}/${product.handle}`}>
                    <ShopProductCard locale={locale} product={product} />
                </li>
            ))}
        </ul>
    );
}
