'use client';

import type { LucideIcon } from 'lucide-react';

type MoveArrowButtonProps = {
    label: string;
    disabled: boolean;
    onClick: () => void;
    icon: LucideIcon;
};

// A round arrow of a custom section's move controls, in the old editor's green.
export function MoveArrowButton({ label, disabled, onClick, icon: Icon }: MoveArrowButtonProps) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onClick}
            className="grid h-8 w-8 place-items-center rounded-full bg-[#eef5f2] text-[#3f7668] focus-visible:outline-2 focus-visible:outline-(--smd-editor-accent) disabled:cursor-not-allowed disabled:opacity-30"
        >
            <Icon className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
        </button>
    );
}
