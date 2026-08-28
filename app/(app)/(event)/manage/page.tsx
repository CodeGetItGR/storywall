import { redirect } from 'next/navigation';

import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { routes } from '@/lib/routes';

// Bare /manage has no event id, so it can't render a dashboard itself — it
// exists only so old bookmarks/links keep working. Resolved and redirected
// entirely server-side (same active-event resolution as the (event) layout)
// to the id-scoped route, mirroring app/(app)/feed/page.tsx.
export default async function ManageRedirectPage() {
    const context = await resolveServerEventContext();

    redirect(context?.activeEventId ? routes.events.manage(context.activeEventId) : routes.home);
}
