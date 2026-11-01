import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { VendorPage } from '@/components/vendorPages/VendorPage';
import { VENDOR_PAGE_SLUGS, VENDOR_PAGE_TYPES, vendorPageTypeForSlug } from '@/i18n/publicLocale';
import { getVendorPageMetadata } from '@/lib/forBusinessMetadata';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

type PageProps = { params: Promise<{ slug: string; vendorType: string }> };

// The Greek vendor pages, only under /el/epaggelmaties. The English ones live under /for-business.
export function generateStaticParams() {
    return VENDOR_PAGE_TYPES.map((type) => ({ slug: 'el', vendorType: VENDOR_PAGE_SLUGS[type].el }));
}

async function pageType(params: PageProps['params']) {
    const { slug, vendorType } = await params;
    return slug === 'el' ? vendorPageTypeForSlug(vendorType, 'el') : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const type = await pageType(params);
    if (!type || !showsUnreleasedPages()) return {};
    return getVendorPageMetadata(type, 'el');
}

export default async function Page({ params }: PageProps) {
    const type = await pageType(params);
    if (!type || !showsUnreleasedPages()) notFound();
    return <VendorPage type={type} />;
}
