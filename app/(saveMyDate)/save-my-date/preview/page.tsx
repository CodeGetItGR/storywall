import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { fetchUploadedFonts } from '@/lib/invitation/serverUploadedFonts';
import { PREVIEW_THEME, previewDateOptions, previewDocument, previewMedia } from '@/lib/saveMyDatePreview';
import { showsSaveMyDate } from '@/lib/saveMyDateRelease';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('SaveMyDatePreview');
    return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

type PreviewPageProps = { searchParams: Promise<{ date?: string | string[]; lang?: string | string[] }> };

// Staging only: a sample invitation drawn by the shared renderer.
// ?date=<layout>&lang=en picks the date section's layout and language.
export default async function SaveMyDatePreviewPage({ searchParams }: PreviewPageProps) {
    if (!showsSaveMyDate()) notFound();
    const { style, lang } = previewDateOptions(await searchParams);

    return (
        <InvitationRenderer
            document={previewDocument(style, lang)}
            theme={PREVIEW_THEME}
            media={previewMedia}
            uploadedFonts={await fetchUploadedFonts()}
        />
    );
}
