import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { loadPreviewInvitation, type PreviewParams } from '@/lib/invitation/serverThemePreview';
import { fetchUploadedFonts } from '@/lib/invitation/serverUploadedFonts';
import { showsSaveMyDate } from '@/lib/saveMyDateRelease';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('SaveMyDatePreview');
    return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

type PreviewPageProps = { searchParams: Promise<PreviewParams> };

// Staging only, drawn by the shared renderer: ?theme=<slug> shows an active theme's starting
// invitation; without it, a made-up sample whose date layout and language ?date=<layout>&lang=en pick.
export default async function SaveMyDatePreviewPage({ searchParams }: PreviewPageProps) {
    if (!showsSaveMyDate()) notFound();
    const [invitation, uploadedFonts] = await Promise.all([loadPreviewInvitation(await searchParams), fetchUploadedFonts()]);
    if (!invitation) notFound();

    return (
        <InvitationRenderer
            document={invitation.document}
            theme={invitation.theme}
            media={invitation.media}
            uploadedFonts={uploadedFonts}
        />
    );
}
