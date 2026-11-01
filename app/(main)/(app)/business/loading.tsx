import { BusinessSkeleton } from '@/components/business/BusinessSkeleton';

// Shown the moment a link here is clicked, while the server renders the page.
export default function Loading() {
    return (
        <div className="mx-auto max-w-5xl px-4 pt-20 pb-8">
            <BusinessSkeleton />
        </div>
    );
}
