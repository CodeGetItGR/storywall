import { AuthLoadingState } from '@/components/layout/AuthLoadingState';

// Shown the moment a link here is clicked, while the server renders the page: the same spinner the
// page shows until the visitor's session is known.
export default function Loading() {
    return (
        <main className="h-full">
            <AuthLoadingState />
        </main>
    );
}
