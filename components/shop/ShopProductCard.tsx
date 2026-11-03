import { getTranslations } from 'next-intl/server';

import { SHOP_MUTED } from '@/components/shop/shopStyles';
import { AppLink } from '@/components/ui/AppLink';
import type { Locale } from '@/i18n/config';
import type { ShopProductCardDto } from '@/lib/api/types';
import { formatShopPrice, shopImageUrl, shopProductPath } from '@/lib/shop';

export async function ShopProductCard({ locale, product }: { locale: Locale; product: ShopProductCardDto }) {
    const t = await getTranslations({ locale, namespace: 'Shop' });

    return (
        <AppLink href={shopProductPath(locale, product.storeSlug, product.handle)} className="group flex flex-col gap-3 text-[#151313]! no-underline">
            {/* Image */}
            <div className="aspect-square overflow-hidden rounded-2xl bg-white">
                {product.imageUrl && (
                    // Plain img: Shopify's CDN resizes, so the Next optimizer (billed per image) stays out of it.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={shopImageUrl(product.imageUrl, 600)}
                        alt={product.imageAlt || product.title}
                        width={600}
                        height={600}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform group-hover:scale-[1.02] motion-reduce:transition-none"
                    />
                )}
            </div>
            {/* Details */}
            <div className="flex flex-col gap-1">
                <p className={`m-0 text-xs font-semibold ${SHOP_MUTED}`}>{product.isDigital ? t('digital') : t('printed')}</p>
                <h2 className="m-0 line-clamp-2 text-base font-semibold">{product.title}</h2>
                <p className="m-0">{formatShopPrice(locale, product.minPriceCents, product.maxPriceCents, product.currency)}</p>
            </div>
        </AppLink>
    );
}
