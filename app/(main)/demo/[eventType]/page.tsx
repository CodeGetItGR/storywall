import { redirect } from 'next/navigation';

export default async function DemoEventTypeIndexPage({ params }: { params: Promise<{ eventType: string }> }) {
    const { eventType } = await params;
    redirect(`/demo/${eventType}/feed`);
}
