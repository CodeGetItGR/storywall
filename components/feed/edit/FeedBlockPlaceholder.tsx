// A block with nothing to show yet (no description, no RSVP to ask for), drawn by its name while editing.
export function FeedBlockPlaceholder({ name }: { name: string }) {
    return <p className="px-4 pt-3 pb-6 text-center text-sm text-ink-muted">{name}</p>;
}
