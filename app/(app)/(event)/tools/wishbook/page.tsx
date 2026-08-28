import { redirect } from 'next/navigation';

import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { routes } from '@/lib/routes';

// Bare /tools/wishbook has no event id — kept only so old bookmarks/links
// keep working. See app/(app)/(event)/manage/page.tsx for the pattern.
export default async function WishbookRedirectPage() {
    const context = await resolveServerEventContext();

    redirect(context?.activeEventId ? routes.events.tools.wishbook(context.activeEventId) : routes.home);
}
