import { redirect } from 'next/navigation';

import { routes } from '@/lib/routes';

type PageProps = { params: Promise<{ eventId: string }> };

export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    redirect(routes.events.manage(eventId, { tab: 'billing' }));
}
