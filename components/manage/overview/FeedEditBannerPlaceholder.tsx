// The banner picture's stand-in while its data or its lazy code loads. Its own file, so the Overview can show it
// without importing the picture's renderer.
export function FeedEditBannerPlaceholder() {
    return <div className="bg-surface aspect-[4/5] w-full" />;
}
