import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { VendorPage } from '@/components/vendorPages/VendorPage';
import { VENDOR_PAGE_SLUGS, VENDOR_PAGE_TYPES, vendorPageTypeForSlug } from '@/i18n/publicLocale';
import { getVendorPageMetadata } from '@/lib/forBusinessMetadata';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

type PageProps = { params: Promise<{ vendorType: string }> };

// The English vendor pages. The proxy pins these URLs to English; any other slug 404s.
export function generateStaticParams() {
    return VENDOR_PAGE_TYPES.map((type) => ({ vendorType: VENDOR_PAGE_SLUGS[type].en }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const type = vendorPageTypeForSlug((await params).vendorType, 'en');
    if (!type || !showsUnreleasedPages()) return {};
    return getVendorPageMetadata(type, 'en');
}

export default async function Page({ params }: PageProps) {
    const type = vendorPageTypeForSlug((await params).vendorType, 'en');
    if (!type || !showsUnreleasedPages()) notFound();
    return <VendorPage type={type} />;
}
