import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { SHOP_INNER, SHOP_MUTED, SHOP_PRIMARY_BUTTON, SHOP_SCROLL_ROW } from '@/components/shop/shopStyles';
import { AppLink } from '@/components/ui/AppLink';
import type { Locale } from '@/i18n/config';
import type { ShopProductDto } from '@/lib/api/types';
import { formatShopPrice, shopImageUrl, shopListPath } from '@/lib/shop';

// Shopify's name for the only variant of a product without options.
const DEFAULT_VARIANT_TITLE = 'Default Title';

// The buy button leaves storywall: Shopify handles cart, payment and shipping.
export async function ShopProductPage({ locale, product }: { locale: Locale; product: ShopProductDto }) {
    const t = await getTranslations({ locale, namespace: 'Shop' });
    const variants = product.variants.filter((v) => v.title !== DEFAULT_VARIANT_TITLE);

    return (
        <main className={`${SHOP_INNER} flex flex-col gap-6 pt-2 pb-16 min-[761px]:pb-24`}>
            {/* Back */}
            <AppLink href={shopListPath(locale)} className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-[#151313]! no-underline">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t('back')}
            </AppLink>
            <div className="grid gap-8 lg:grid-cols-2">
                {/* Images: swipe on phones, stacked on desktop */}
                <ul className={`${SHOP_SCROLL_ROW} -mx-5 m-0 flex list-none snap-x snap-mandatory gap-3 px-5 py-0 lg:mx-0 lg:grid lg:overflow-visible lg:px-0`}>
                    {product.images.map((image) => (
                        <li key={image.url} className="w-[85%] shrink-0 snap-center lg:w-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={shopImageUrl(image.url, 1000)}
                                alt={image.alt || product.title}
                                width={1000}
                                height={1000}
                                className="aspect-square w-full rounded-2xl bg-white object-cover"
                            />
                        </li>
                    ))}
                </ul>
                {/* Details */}
                <div className="flex flex-col gap-4">
                    <p className={`m-0 text-sm font-semibold ${SHOP_MUTED}`}>{product.isDigital ? t('digital') : t('printed')}</p>
                    <h1 className="m-0 text-2xl font-extrabold tracking-tight min-[761px]:text-3xl">{product.title}</h1>
                    <p className="m-0 text-xl">{formatShopPrice(locale, product.minPriceCents, product.maxPriceCents, product.currency)}</p>
                    {/* Options */}
                    {variants.length > 0 && (
                        <ul className="m-0 flex list-none flex-col gap-1 p-0">
                            {variants.map((variant) => (
                                <li key={variant.title} className="flex justify-between gap-4">
                                    <span>{variant.title}</span>
                                    <span>{formatShopPrice(locale, variant.priceCents, variant.priceCents, product.currency)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {/* Buy */}
                    <a href={product.productUrl} target="_blank" rel="noopener" className={SHOP_PRIMARY_BUTTON}>
                        {t('buyAt', { store: product.storeName })}
                        <ExternalLink className="h-4 w-4" aria-hidden />
                    </a>
                    {/* Description */}
                    {product.description && <p className="m-0 whitespace-pre-line">{product.description}</p>}
                </div>
            </div>
        </main>
    );
}
