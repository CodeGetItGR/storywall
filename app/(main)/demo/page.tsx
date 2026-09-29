import { redirect } from 'next/navigation';

import { DEFAULT_DEMO_EVENT_TYPE_SLUG } from '@/lib/demo/demoEventTypes';

export default function DemoIndexPage() {
    redirect(`/demo/${DEFAULT_DEMO_EVENT_TYPE_SLUG}/feed`);
}
