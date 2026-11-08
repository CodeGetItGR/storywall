import { copy } from '../../copy';

// Only shows on a phone, where the sidebar is a drawer.
export function TopBar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
    return (
        <div className="top">
            <button type="button" className="btn" onClick={onOpenDrawer}>
                {copy.stories}
            </button>
            <b>{copy.title}</b>
        </div>
    );
}
