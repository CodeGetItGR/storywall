import { redirect } from 'next/navigation';

import { routes } from '@/lib/routes';

type PageProps = { params: Promise<{ eventId: string }> };

// The gallery's own upload code page is gone: the event's one code lives on Share links (KAN-208).
export default async function Page({ params }: PageProps) {
    redirect(routes.events.invitationsQr((await params).eventId));
}
