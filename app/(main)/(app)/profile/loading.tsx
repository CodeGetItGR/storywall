import { LoadingState } from '@/components/ui/LoadingState';

// Shown the moment a link here is clicked, while the server renders the page.
export default function Loading() {
    return <LoadingState size="md" className="min-h-[50vh]" />;
}
