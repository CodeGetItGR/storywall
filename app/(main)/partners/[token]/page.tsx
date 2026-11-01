import { redirect } from 'next/navigation';

import { routes } from '@/lib/routes';

// Old partner links (KAN-28): the token opens nothing now. Sign-in, if needed, happens on the way to /partner.
export default function OldPartnerLinkPage() {
    redirect(routes.business);
}
