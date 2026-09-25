import type { Metadata } from 'next';

import { qrShareMetadata } from '@/lib/shareMetadata';

export { default } from './PageClient';

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    return qrShareMetadata((await params).token);
}
