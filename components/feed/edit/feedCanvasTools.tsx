import { FeedPhotoRemove } from '@/components/feed/edit/FeedPhotoRemove';
import type { CanvasTools } from '@/lib/invitation/canvasTools';

// Feed edit mode's tools inside a Save my date block: a photo the host added gets a ✕ (Open question 7). The renderer
// leaves this place inside an added image, so guests get none of it.
export function feedCanvasTools(onRemove: (elementId: string) => void): CanvasTools {
    return {
        element: (element) => (element.kind === 'image' ? <FeedPhotoRemove elementId={element.id} onRemove={onRemove} /> : null),
    };
}
