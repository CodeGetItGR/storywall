import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { parityMedia, readParityInput } from '@/lib/invitation/parity';
import { fetchUploadedFonts } from '@/lib/invitation/serverUploadedFonts';

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Local only: the invitation the old vs new check is comparing.
export default async function SaveMyDateParityPage() {
    const input = readParityInput();
    if (!input) notFound();

    return <InvitationRenderer document={input.document} theme={input.theme} media={parityMedia(input)} uploadedFonts={await fetchUploadedFonts()} />;
}
