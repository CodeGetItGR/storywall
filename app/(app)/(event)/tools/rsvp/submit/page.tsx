import { redirect } from 'next/navigation';

import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { routes } from '@/lib/routes';

type PageProps = { searchParams: Promise<{ attending?: string }> };

// Bare /tools/rsvp/submit has no event id — kept only so old bookmarks/links
// (including any with an `attending` preset) keep working. See
// app/(app)/(event)/manage/page.tsx for the pattern.
export default async function RsvpSubmitRedirectPage({ searchParams }: PageProps) {
    const [context, { attending }] = await Promise.all([resolveServerEventContext(), searchParams]);
    const preset = attending === 'attending' || attending === 'not-attending' ? attending : null;

    redirect(context?.activeEventId ? routes.events.tools.rsvpSubmit(context.activeEventId, preset) : routes.home);
}
