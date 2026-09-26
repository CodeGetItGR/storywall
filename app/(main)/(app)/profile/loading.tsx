import { ProfilePageSkeleton } from '@/components/profile/ProfilePageSkeleton';

// Shown the moment a link here is clicked, while the server renders the page.
export default function Loading() {
    return <ProfilePageSkeleton />;
}
