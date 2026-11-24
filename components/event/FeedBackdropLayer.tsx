// A Save my date cover picture that fills the screen and stays still while the page scrolls over it. It goes first
// in the page (EventThemeScope), with the page's content after it in .feed-backdrop-content (feedBackdrop.css).
export function FeedBackdropLayer() {
    return <div aria-hidden="true" data-feed-backdrop-layer="" className="feed-backdrop-layer" />;
}
