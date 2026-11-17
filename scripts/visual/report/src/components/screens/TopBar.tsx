import type { Ref } from 'react';

import { copy } from '../../copy';

type TopBarProps = { open: boolean; buttonRef: Ref<HTMLButtonElement>; onOpenDrawer: () => void };

// Only shows on a phone, where the sidebar is a drawer.
export function TopBar({ open, buttonRef, onOpenDrawer }: TopBarProps) {
    return (
        <div className="top">
            <button type="button" className="btn" ref={buttonRef} aria-expanded={open} onClick={onOpenDrawer}>
                {copy.stories}
            </button>
            <b>{copy.title}</b>
        </div>
    );
}
