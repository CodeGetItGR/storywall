import { redirect } from 'next/navigation';

import { EXTEND_COVERAGE_SECTION_ID } from '@/lib/billing';
import { routes } from '@/lib/routes';

type PageProps = { params: Promise<{ eventId: string }>; searchParams: Promise<{ extend?: string | string[] }> };

export default async function Page({ params, searchParams }: PageProps) {
    const { eventId } = await params;
    const { extend } = await searchParams;
    // ?extend=1 is the coverage-ending notification's CTA: land on the extension picker.
    const section = extend === '1' ? EXTEND_COVERAGE_SECTION_ID : null;
    redirect(routes.events.manage(eventId, { tab: 'billing', section }));
}
