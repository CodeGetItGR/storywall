import { CheckoutReviewSkeleton } from '@/components/checkout/CheckoutSkeletons';

// Shown the moment a link here is clicked, while the server renders the page.
export default function Loading() {
    return <CheckoutReviewSkeleton />;
}
