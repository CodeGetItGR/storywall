import { FeedRouteLoading } from '@/components/feed/FeedRouteLoading';
import { showsFeedEditor } from '@/lib/feedEditorRelease';
import { FeedEditorFlagProvider } from '@/providers/FeedEditorFlagProvider';

// Shown the moment a link to the feed is clicked, while the server renders it.
export default function Loading() {
    return (
        <FeedEditorFlagProvider enabled={showsFeedEditor()}>
            <FeedRouteLoading />
        </FeedEditorFlagProvider>
    );
}
