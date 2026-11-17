import type { ReactNode } from 'react';

type EditorDockedPanelProps = {
    title: string;
    // Beside the title, such as a section's Done.
    action?: ReactNode;
    children: ReactNode;
};

// A side panel beside the canvas on wide screens. Narrower screens open the same content in a sheet.
export function EditorDockedPanel({ title, action, children }: EditorDockedPanelProps) {
    return (
        <aside
            aria-label={title}
            className="m-2 mt-6 hidden max-h-[calc(100%-2rem)] w-63 shrink-0 flex-col gap-2 self-start overflow-y-auto rounded-[15px] border border-(--smd-editor-panel-line) bg-(--smd-editor-panel) p-3 text-[12.5px] text-(--smd-editor-text) min-[1101px]:flex"
        >
            {/* Title */}
            {action ? (
                <div className="flex items-center justify-between gap-2">
                    <h2 className="min-w-0 truncate text-[13px] font-bold text-white">{title}</h2>
                    {action}
                </div>
            ) : (
                <h2 className="text-[13px] font-bold text-white">{title}</h2>
            )}

            {/* Content */}
            {children}
        </aside>
    );
}
