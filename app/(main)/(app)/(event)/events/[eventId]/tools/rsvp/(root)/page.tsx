import RsvpPage from '../PageClient';

// Hosts are sent on to the RSVP page in the dashboard (KAN-227), which prefetches
// its own data; guests go to the submit page. Nothing to prefetch here.
export default function Page() {
    return <RsvpPage />;
}
