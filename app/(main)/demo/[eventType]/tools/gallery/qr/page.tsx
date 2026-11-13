import { redirect } from 'next/navigation';

type PageProps = { params: Promise<{ eventType: string }> };

// The gallery's own upload code page is gone: the event's one code lives on Share links (KAN-208).
export default async function DemoGalleryQrPage({ params }: PageProps) {
    redirect(`/demo/${(await params).eventType}/manage/qr`);
}
