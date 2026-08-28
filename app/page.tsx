import { redirect } from 'next/navigation';

import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { routes } from '@/lib/routes';

// Same active-event resolution as app/(app)/feed/page.tsx, but also covers
// the unauthenticated case: an already-logged-in user landing on "/" (e.g. a
// bookmark) should go straight into the app, not be bounced to /login.
export default async function Page() {
    const context = await resolveServerEventContext();

    if (!context) redirect(routes.login);

    redirect(context.activeEventId ? routes.events.feed(context.activeEventId) : routes.home);
}
