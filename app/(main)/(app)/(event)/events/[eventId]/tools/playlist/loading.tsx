import { PlaylistPageSkeleton } from '@/components/playlist/PlaylistSkeletons';

// Shown the moment a link here is clicked, while the server renders the page.
export default function Loading() {
    return <PlaylistPageSkeleton />;
}
