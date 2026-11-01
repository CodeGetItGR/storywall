import { permanentRedirect } from 'next/navigation';

import { routes } from '@/lib/routes';

// The partner page is now part of the business page (spec 2026-11-01).
export default function PartnerPage() {
    permanentRedirect(routes.business);
}
