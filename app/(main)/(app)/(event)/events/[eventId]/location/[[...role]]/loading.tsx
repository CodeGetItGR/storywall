import { SessionLocationPageSkeleton } from '@/components/session-location/SessionLocationPageSkeleton';

// Shown the moment a link here is clicked, while the server renders the page.
export default function Loading() {
    return <SessionLocationPageSkeleton />;
}
