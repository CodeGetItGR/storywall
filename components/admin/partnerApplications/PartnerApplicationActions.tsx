'use client';

import type { AdminPartnerApplicationDto } from '@/lib/api/types';

export function PartnerApplicationActions({ application }: { application: AdminPartnerApplicationDto }) {
    return <div data-application={application.id} />;
}
