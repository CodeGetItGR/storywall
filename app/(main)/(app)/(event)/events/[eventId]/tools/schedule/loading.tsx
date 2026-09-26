import { SchedulePageSkeleton } from '@/components/schedule/ScheduleSkeletons';

// Shown the moment a link here is clicked, while the server renders the page.
export default function Loading() {
    return <SchedulePageSkeleton />;
}
