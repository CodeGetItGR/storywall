import type { ChangeEvent, ReactNode } from 'react';

type TextToolbarSelectProps = {
    label: string;
    value: string;
    onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
    children: ReactNode;
};

// A short list in the text toolbar (size, line spacing). The phone's own picker opens it.
export function TextToolbarSelect({ label, value, onChange, children }: TextToolbarSelectProps) {
    return (
        <select
            aria-label={label}
            title={label}
            value={value}
            onChange={onChange}
            className="h-10 shrink-0 cursor-pointer rounded-[10px] border-0 bg-(--smd-editor-control) pr-7 pl-2.5 text-[13px] text-(--smd-editor-text) hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
            {children}
        </select>
    );
}
