export function StoryRouteLoading() {
    return (
        <div className="fixed inset-0 z-50 flex h-dvh flex-col items-center justify-center overflow-hidden bg-ink">
            {/* Story loading frame */}
            <div className="relative h-dvh w-full max-w-sm overflow-hidden bg-black" />
        </div>
    );
}
