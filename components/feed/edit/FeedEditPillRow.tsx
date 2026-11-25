import type { Ref } from 'react';

import { FeedEditPill } from '@/components/feed/edit/FeedEditPill';

type FeedEditPillRowProps = {
    // Edit mode is loading: the row keeps its room for FeedEditRow.
    editing: boolean;
    pillRef?: Ref<HTMLButtonElement>;
    onEdit: () => void;
};

// The Edit pill under the cover, where edit mode's FeedEditRow takes its place. Same height as that row, so nothing
// below moves.
export function FeedEditPillRow({ editing, pillRef, onEdit }: FeedEditPillRowProps) {
    return (
        <div className="border-b border-transparent px-3 pt-3 pb-4 font-sans sm:px-4">
            <div className="flex h-8 items-center justify-center sm:h-9">{!editing && <FeedEditPill ref={pillRef} onClick={onEdit} />}</div>
        </div>
    );
}
