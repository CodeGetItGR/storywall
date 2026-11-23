// The banner picture's stand-in while its data or its lazy code loads. Its own file, so the Overview can show it
// without importing the picture's renderer. The same frame as the picture, so nothing moves when it arrives.
export function FeedEditBannerPlaceholder() {
    return <div className="aspect-[11/8] w-full rounded-xl bg-card" />;
}
