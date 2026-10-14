import { earlyDemoSnapshotScript } from '@/lib/demo/snapshotClient';

// Starts the snapshot request while the demo's JS is still loading, on a full page load.
export function DemoSnapshotEarlyRequest({ eventTypeKey }: { eventTypeKey: string }) {
    return <script dangerouslySetInnerHTML={{ __html: earlyDemoSnapshotScript(eventTypeKey) }} />;
}
