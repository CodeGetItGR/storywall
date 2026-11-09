import type { ReactNode } from 'react';

type EditorIconButtonProps = {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    children: ReactNode;
};

// A square button of the editor's top bar, big enough for a thumb.
export function EditorIconButton({ label, onClick, disabled = false, children }: EditorIconButtonProps) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            disabled={disabled}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-(--smd-editor-text) transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent [&_svg]:h-5 [&_svg]:w-5"
        >
            {children}
        </button>
    );
}
