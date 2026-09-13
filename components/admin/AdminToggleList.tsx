'use client';

import { AdminSwitch } from '@/components/admin/AdminSwitch';

export type AdminToggleItem = {
    key: string;
    label: string;
    hint?: string;
    /** Locked rows keep their current state; `hint` should say why. */
    locked?: boolean;
};

function AdminToggleRow({
    item,
    checked,
    changed,
    changedLabel,
    onToggleAction,
}: {
    item: AdminToggleItem;
    checked: boolean;
    changed: boolean;
    changedLabel: string;
    onToggleAction: (key: string, next: boolean) => void;
}) {
    function handleCheckedChange(next: boolean) {
        onToggleAction(item.key, next);
    }

    return (
        <AdminSwitch
            label={item.label}
            description={item.hint}
            checked={checked}
            disabled={item.locked}
            badge={
                changed ? (
                    <span className="rounded-full bg-primary-light px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-primary-dark">
                        {changedLabel}
                    </span>
                ) : undefined
            }
            onCheckedChangeAction={handleCheckedChange}
        />
    );
}

// Every option stays on screen, on or off, so turning one off is visibly
// reversible instead of removing it from a list the admin then has to find again.
// Rows that differ from the saved state are marked so pending edits are obvious.
export function AdminToggleList({
    items,
    selected,
    baseline,
    changedLabel,
    onToggleAction,
}: {
    items: AdminToggleItem[];
    selected: string[];
    baseline: string[];
    changedLabel: string;
    onToggleAction: (key: string, next: boolean) => void;
}) {
    const selectedSet = new Set(selected);
    const baselineSet = new Set(baseline);

    return (
        <div className="overflow-hidden rounded-lg border border-border">
            {items.map((item) => (
                <AdminToggleRow
                    key={item.key}
                    item={item}
                    checked={selectedSet.has(item.key)}
                    changed={selectedSet.has(item.key) !== baselineSet.has(item.key)}
                    changedLabel={changedLabel}
                    onToggleAction={onToggleAction}
                />
            ))}
        </div>
    );
}
