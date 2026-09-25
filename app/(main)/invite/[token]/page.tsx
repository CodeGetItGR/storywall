import type { Metadata } from 'next';

import { inviteShareMetadata } from '@/lib/shareMetadata';

export { default } from './PageClient';

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    return inviteShareMetadata((await params).token);
}
