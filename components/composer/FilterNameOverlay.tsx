interface FilterNameOverlayProps {
    name: string | null;
}

export function FilterNameOverlay({ name }: FilterNameOverlayProps) {
    if (!name) return null;

    return (
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-md motion-safe:animate-in motion-safe:fade-in">
            {name}
        </div>
    );
}
