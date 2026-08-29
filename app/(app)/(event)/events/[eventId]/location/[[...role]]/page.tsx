import SessionLocationPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string; role?: string[] }> };

export default function Page({ params }: PageProps) {
    return <SessionLocationPage params={params} />;
}
