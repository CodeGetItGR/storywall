import { redirect } from 'next/navigation';

import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { routes } from '@/lib/routes';

// Bare /feed has no event id, so it can't render a feed itself — it exists
// only so links like the nav rail's "Home" tab and the post-login redirect
// don't need to know an event id up front. Resolved and redirected entirely
// server-side (same active-event resolution as the (event) layout) instead
// of a client component waiting on membership data to know where to go.
export default async function FeedRedirectPage() {
    const context = await resolveServerEventContext();

    redirect(context?.activeEventId ? routes.post.feed(context.activeEventId) : routes.home);
}
