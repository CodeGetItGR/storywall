// Shapes of the wedding copy read with t.raw (OccasionPages.WEDDING). Strings that hold <b>, <em> or
// <br></br> are read with t.rich by key instead, so they never pass through these types.

// why.with.marquee[n]
export type WeddingMarqueeCopy = { name: string; role: string; moment: string };

// why.with.stats[n]
export type WeddingStatCopy = { value: string; label: string };

// Title and body pairs: rsvp.checklist.items, private.cards.
export type WeddingCardCopy = { title: string; body: string };
