import { redirect } from 'next/navigation';

import { announcementComposerHref } from '@/lib/announcementComposer';

type PageProps = { params: Promise<{ eventId: string }> };

// Announcement is a mode of the feed composer now (KAN-232). Old links land on
// the feed with the composer open in Announcement mode; anyone who can't post
// one just sees the feed.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    redirect(announcementComposerHref(eventId));
}
