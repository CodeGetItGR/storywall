import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { PREVIEW_DOCUMENT, PREVIEW_THEME, previewMedia } from '@/lib/saveMyDatePreview';
import { showsSaveMyDate } from '@/lib/saveMyDateRelease';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('SaveMyDatePreview');
    return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

// Staging only: a sample invitation drawn by the shared renderer.
export default function SaveMyDatePreviewPage() {
    if (!showsSaveMyDate()) notFound();

    return <InvitationRenderer document={PREVIEW_DOCUMENT} theme={PREVIEW_THEME} media={previewMedia} />;
}
